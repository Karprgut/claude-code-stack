/**
 * Google Ads ingestion for the client reports feature.
 * Mirrors meta.ts: one AccountSnapshot per client with a `googleCustomerId`.
 *
 * Auth: Global OAuth2 refresh-token flow (dev token + client ID/secret + refresh
 * token in env). One set of creds across all customer IDs — per-client
 * customerId is on `ad_clients.googleCustomerId`.
 */

import type {
  AccountSnapshot,
  Ad,
  Campaign,
  ReportClient,
} from "../reports";
import { getAllClients } from "../reports";

const API_VERSION = "v22";
const BASE = `https://googleads.googleapis.com/${API_VERSION}`;
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleTimeRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

// ─── Helpers ──────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Date ranges follow the ad account's *operating* timezone — for KCL
// (all clients in this codebase) that's America/Mexico_City. Using UTC
// here used to roll over to the next month around 18:00 MX and zero out
// the ingest until the next day's spend showed up: e.g. at 22:30 MX on
// May 31 (= 04:30 UTC Jun 1) the UTC version asked Google for
// 2026-06-01..2026-06-01 and got back $0 for everyone. Meta wasn't
// affected because Meta's preset honours the ad account TZ.
const REPORT_TZ = "America/Mexico_City";
function localYmd(): { year: number; month: number; day: number } {
  // `en-CA` gives ISO-style YYYY-MM-DD without re-parsing locale strings.
  const ymd = new Date().toLocaleDateString("en-CA", { timeZone: REPORT_TZ });
  const [y, m, d] = ymd.split("-").map((s) => parseInt(s, 10));
  return { year: y, month: m, day: d };
}
function firstOfMonthISO(): string {
  const { year, month } = localYmd();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function todayISO(): string {
  const { year, month, day } = localYmd();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toNum(v: string | number | undefined | null): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function micros(v: string | undefined): number {
  return toNum(v) / 1_000_000;
}

export function normalizeCustomerId(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

// Access token cache — shared across all customers within a single cron run.
let cachedAccess: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccess && Date.now() < cachedAccess.expiresAt - 60_000) {
    return cachedAccess.token;
  }
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_ADS_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_ADS_CLIENT_SECRET"),
    refresh_token: requireEnv("GOOGLE_ADS_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error(`OAuth exchange ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccess = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

interface SearchStreamChunk<T> { results?: T[] }

export async function searchStream<T>(customerId: string, query: string): Promise<T[]> {
  const accessToken = await getAccessToken();
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN"),
    "Content-Type": "application/json",
  };
  if (loginCustomerId) headers["login-customer-id"] = normalizeCustomerId(loginCustomerId);

  const url = `${BASE}/customers/${normalizeCustomerId(customerId)}/googleAds:searchStream`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`Google Ads ${res.status}: ${(await res.text()).slice(0, 2500)}`);
  }
  const body = (await res.json()) as SearchStreamChunk<T>[];
  return body.flatMap((chunk) => chunk.results ?? []);
}

// ─── Creative thumbnails ──────────────────────────────────────────────
// Google has no single rendered-preview URL like Meta. We resolve a
// representative image per ad/asset-group from the asset link views:
//   image  → asset.image_asset.full_size.url
//   video  → YouTube thumbnail from asset.youtube_video_asset.youtube_video_id
// RSA (search) has no creative image and stays null — the UI placeholder
// covers it. All resolution is best-effort: any failure yields an empty map
// so creative enrichment can never break the ingest.

// Higher in the list = preferred when an entity has several images.
const THUMB_FIELD_PRIORITY = [
  "MARKETING_IMAGE",
  "SQUARE_MARKETING_IMAGE",
  "PORTRAIT_MARKETING_IMAGE",
  "YOUTUBE_VIDEO",
];

interface AssetThumbShape {
  type?: string;
  imageAsset?: { fullSize?: { url?: string } };
  youtubeVideoAsset?: { youtubeVideoId?: string };
}

function assetThumbUrl(asset: AssetThumbShape | undefined): string | null {
  const img = asset?.imageAsset?.fullSize?.url;
  if (img) return img;
  const vid = asset?.youtubeVideoAsset?.youtubeVideoId;
  if (vid) return `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  return null;
}

interface AdAssetViewRow {
  adGroupAd: { ad: { id: string } };
  asset: AssetThumbShape;
  adGroupAdAssetView: { fieldType?: string };
}

/** Resolve one thumbnail per ad id from `ad_group_ad_asset_view`. */
async function fetchAdThumbnails(customerId: string, adIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (adIds.length === 0) return out;
  const bestRank = new Map<string, number>();
  try {
    const idList = adIds.map((id) => `'${id}'`).join(",");
    const query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad_asset_view.field_type,
        asset.type,
        asset.image_asset.full_size.url,
        asset.youtube_video_asset.youtube_video_id
      FROM ad_group_ad_asset_view
      WHERE ad_group_ad.ad.id IN (${idList})
        AND ad_group_ad_asset_view.field_type IN ('MARKETING_IMAGE','SQUARE_MARKETING_IMAGE','PORTRAIT_MARKETING_IMAGE','YOUTUBE_VIDEO')
    `;
    const rows = await searchStream<AdAssetViewRow>(customerId, query);
    for (const r of rows) {
      const adId = r.adGroupAd?.ad?.id;
      const url = assetThumbUrl(r.asset);
      if (!adId || !url) continue;
      const ft = r.adGroupAdAssetView?.fieldType ?? "";
      const rank = THUMB_FIELD_PRIORITY.indexOf(ft);
      const eff = rank === -1 ? 99 : rank;
      const prev = bestRank.get(adId);
      if (prev === undefined || eff < prev) { bestRank.set(adId, eff); out.set(adId, url); }
    }
  } catch (err) {
    console.error(`[google] ad thumbnail enrichment failed:`, err);
  }
  return out;
}

interface RsaContentRow {
  adGroupAd: {
    ad: {
      id: string;
      finalUrls?: string[];
      responsiveSearchAd?: {
        headlines?: Array<{ text?: string }>;
        descriptions?: Array<{ text?: string }>;
        path1?: string;
        path2?: string;
      };
    };
  };
}

export interface SearchAdContent {
  headlines: string[];
  descriptions: string[];
  displayUrl: string | null;
}

/** Build the Google "display URL" (domain + optional /path1/path2). */
function composeDisplayUrl(finalUrl: string | undefined, path1?: string, path2?: string): string | null {
  if (!finalUrl) return null;
  let host: string;
  try {
    host = new URL(finalUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  const parts = [path1, path2].filter((p): p is string => !!p && p.length > 0);
  return parts.length ? `${host}/${parts.join("/")}` : host;
}

/**
 * Pull Responsive Search Ad text per ad id (headlines, descriptions, display
 * URL). Search ads have no creative image — this is what powers the readable
 * name and the Google-SERP-style text preview. Best-effort.
 */
async function fetchSearchAdContent(customerId: string, adIds: string[]): Promise<Map<string, SearchAdContent>> {
  const out = new Map<string, SearchAdContent>();
  if (adIds.length === 0) return out;
  try {
    const idList = adIds.map((id) => `'${id}'`).join(",");
    const query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.final_urls,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.responsive_search_ad.path1,
        ad_group_ad.ad.responsive_search_ad.path2
      FROM ad_group_ad
      WHERE ad_group_ad.ad.id IN (${idList})
        AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
    `;
    const rows = await searchStream<RsaContentRow>(customerId, query);
    for (const r of rows) {
      const ad = r.adGroupAd?.ad;
      const adId = ad?.id;
      if (!adId) continue;
      const rsa = ad.responsiveSearchAd;
      const headlines = (rsa?.headlines ?? []).map((h) => h.text).filter((t): t is string => !!t);
      const descriptions = (rsa?.descriptions ?? []).map((d) => d.text).filter((t): t is string => !!t);
      if (headlines.length === 0) continue;
      out.set(adId, {
        headlines,
        descriptions,
        displayUrl: composeDisplayUrl(ad.finalUrls?.[0], rsa?.path1, rsa?.path2),
      });
    }
  } catch (err) {
    console.error(`[google] RSA content enrichment failed:`, err);
  }
  return out;
}

export interface AccountExtensions {
  sitelinks: string[];
  phone: string | null;
}

interface SitelinkRow { asset: { sitelinkAsset?: { linkText?: string } } }
interface CallRow { asset: { callAsset?: { phoneNumber?: string } } }

/**
 * Account-level ad extensions (sitelinks + call) shared across search ads —
 * Google rotates these into the SERP, so we attach the active pool to each
 * search ad's preview. Best-effort: failures yield empty extensions.
 */
async function fetchAccountExtensions(customerId: string): Promise<AccountExtensions> {
  const out: AccountExtensions = { sitelinks: [], phone: null };
  try {
    const sitelinkRows = await searchStream<SitelinkRow>(
      customerId,
      `SELECT asset.sitelink_asset.link_text FROM customer_asset
       WHERE customer_asset.field_type = 'SITELINK' AND customer_asset.status = 'ENABLED'`,
    );
    const seen = new Set<string>();
    for (const r of sitelinkRows) {
      const t = r.asset?.sitelinkAsset?.linkText;
      if (t && !seen.has(t)) { seen.add(t); out.sitelinks.push(t); }
    }
  } catch (err) {
    console.error(`[google] sitelink enrichment failed:`, err);
  }
  try {
    const callRows = await searchStream<CallRow>(
      customerId,
      `SELECT asset.call_asset.phone_number FROM customer_asset WHERE customer_asset.field_type = 'CALL'`,
    );
    out.phone = callRows.find((r) => r.asset?.callAsset?.phoneNumber)?.asset?.callAsset?.phoneNumber ?? null;
  } catch (err) {
    console.error(`[google] call extension enrichment failed:`, err);
  }
  return out;
}

interface AssetGroupAssetRow {
  assetGroup: { id: string };
  asset: AssetThumbShape;
  assetGroupAsset: { fieldType?: string };
}

/** Resolve one thumbnail per Performance Max asset group from `asset_group_asset`. */
async function fetchAssetGroupThumbnails(customerId: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const bestRank = new Map<string, number>();
  try {
    const query = `
      SELECT
        asset_group.id,
        asset_group_asset.field_type,
        asset.type,
        asset.image_asset.full_size.url
      FROM asset_group_asset
      WHERE asset_group_asset.field_type IN ('MARKETING_IMAGE','SQUARE_MARKETING_IMAGE','PORTRAIT_MARKETING_IMAGE')
    `;
    const rows = await searchStream<AssetGroupAssetRow>(customerId, query);
    for (const r of rows) {
      const agId = r.assetGroup?.id;
      const url = assetThumbUrl(r.asset);
      if (!agId || !url) continue;
      const ft = r.assetGroupAsset?.fieldType ?? "";
      const rank = THUMB_FIELD_PRIORITY.indexOf(ft);
      const eff = rank === -1 ? 99 : rank;
      const prev = bestRank.get(agId);
      if (prev === undefined || eff < prev) { bestRank.set(agId, eff); out.set(agId, url); }
    }
  } catch (err) {
    console.error(`[google] asset_group thumbnail enrichment failed:`, err);
  }
  return out;
}

// ─── Types for Google Ads rows ────────────────────────────────────────

interface CampaignRow {
  campaign: {
    id: string;
    name: string;
    status: string;
  };
  campaignBudget?: {
    amountMicros?: string;
    period?: string;
  };
  metrics?: GoogleMetricsResponse;
}

interface AdGroupAdRow {
  campaign: { id: string };
  adGroup: { id: string; name: string };
  adGroupAd: {
    status: string;
    ad: {
      id: string;
      name?: string;
      type?: string;
      finalUrls?: string[];
    };
  };
  metrics?: GoogleMetricsResponse;
}

interface AssetGroupRow {
  campaign: { id: string };
  assetGroup: {
    id: string;
    name: string;
    status: string;
    finalUrls?: string[];
  };
  metrics?: GoogleMetricsResponse;
}

interface GoogleMetricsResponse {
  // Entrega y costo
  costMicros?: string;
  impressions?: string;
  clicks?: string;
  ctr?: number;
  averageCpc?: string;   // micros
  averageCpm?: string;   // micros
  averageCpv?: string;   // micros
  averageCost?: string;  // micros
  topImpressionPercentage?: number;
  absoluteTopImpressionPercentage?: number;
  // Acciones y conversiones
  conversions?: number;
  conversionsValue?: number;
  costPerConversion?: string; // micros
  valuePerConversion?: number;
  conversionRate?: number;
  conversionsFromInteractionsRate?: number;
  allConversions?: number;
  allConversionsValue?: number;
  costPerAllConversions?: string; // micros
  allConversionsValuePerCost?: number;
  valuePerAllConversions?: number;
  crossDeviceConversions?: number;
  viewThroughConversions?: number;
  // Engagement (ya existía)
  engagements?: string;
  engagementRate?: number;
  interactions?: string;
  interactionRate?: number;
}

/**
 * Google Ads GAQL metric selectors. Mirrors the categories we expose on
 * reports: Entrega+Costo y Conversiones. Video (Thruplay) no aplica a
 * campañas no-YouTube; si el cliente trae YouTube TrueView ya se captura
 * el engagement por esta misma ruta.
 */
// Google Ads v22 GAQL selectors at `campaign` level. Kept conservative —
// fields that error depending on campaign type (Search vs Video vs PMax)
// or are only exposed at customer level are excluded:
//   · metrics.average_cost             — not a valid v22 field
//   · metrics.average_cpv               — Video/YouTube only; rejected as
//     "UNRECOGNIZED_FIELD" on non-video accounts
//   · metrics.cross_device_conversions  — customer-level only
//   · metrics.value_per_all_conversions — not a valid field name
// Add more cautiously and re-test against all three clients before shipping.
const GOOGLE_METRIC_SELECTORS = [
  // Entrega y costo
  "metrics.cost_micros",
  "metrics.impressions",
  "metrics.clicks",
  "metrics.ctr",
  "metrics.average_cpc",
  "metrics.average_cpm",
  "metrics.top_impression_percentage",
  "metrics.absolute_top_impression_percentage",
  // Acciones y conversiones
  "metrics.conversions",
  "metrics.conversions_value",
  "metrics.cost_per_conversion",
  "metrics.value_per_conversion",
  "metrics.conversions_from_interactions_rate",
  "metrics.all_conversions",
  "metrics.all_conversions_value",
  "metrics.cost_per_all_conversions",
  // metrics.all_conversions_value_per_cost — PROHIBITED_METRIC on
  // campaign resource (only valid at customer level).
  "metrics.view_through_conversions",
  // Engagement / interactions
  "metrics.engagements",
  "metrics.engagement_rate",
  "metrics.interactions",
  "metrics.interaction_rate",
].join(",\n      ");

/**
 * Convert a Google Ads GAQL metrics payload into the flat dict shape the
 * dashboard consumes. Micros-denominated fields are converted to standard
 * currency units; non-zero values only.
 */
function toGoogleMetricsDict(m?: GoogleMetricsResponse): Record<string, number> {
  const out: Record<string, number> = {};
  if (!m) return out;
  const put = (k: string, v: unknown) => {
    const n = Number(v);
    if (Number.isFinite(n) && n !== 0) out[k] = n;
  };
  const putMicros = (k: string, v: string | undefined) => {
    const n = toNum(v) / 1_000_000;
    if (Number.isFinite(n) && n !== 0) out[k] = n;
  };

  putMicros("spend", m.costMicros);
  put("impressions", m.impressions);
  put("clicks", m.clicks);
  put("ctr", m.ctr);
  putMicros("cpc", m.averageCpc);
  putMicros("cpm", m.averageCpm);
  putMicros("cpv", m.averageCpv);
  putMicros("average_cost", m.averageCost);
  put("top_impression_percentage", m.topImpressionPercentage);
  put("absolute_top_impression_percentage", m.absoluteTopImpressionPercentage);

  put("conversions", m.conversions);
  put("conversions_value", m.conversionsValue);
  putMicros("cost_per_conversion", m.costPerConversion);
  put("value_per_conversion", m.valuePerConversion);
  put("conversion_rate", m.conversionsFromInteractionsRate);
  put("all_conversions", m.allConversions);
  put("all_conversions_value", m.allConversionsValue);
  putMicros("cost_per_all_conversions", m.costPerAllConversions);
  put("all_conversions_value_per_cost", m.allConversionsValuePerCost);
  put("value_per_all_conversions", m.valuePerAllConversions);
  put("cross_device_conversions", m.crossDeviceConversions);
  put("view_through_conversions", m.viewThroughConversions);

  put("engagements", m.engagements);
  put("engagement_rate", m.engagementRate);
  put("interactions", m.interactions);
  put("interaction_rate", m.interactionRate);

  return out;
}

// ─── Main: ingest one account ─────────────────────────────────────────

function pickTimeRange(timeRange?: GoogleTimeRange): { since: string; until: string } {
  if (timeRange && /^\d{4}-\d{2}-\d{2}$/.test(timeRange.since) && /^\d{4}-\d{2}-\d{2}$/.test(timeRange.until)) {
    return { since: timeRange.since, until: timeRange.until };
  }
  return { since: firstOfMonthISO(), until: todayISO() };
}

export async function ingestGoogleAccount(
  client: ReportClient,
  timeRange?: GoogleTimeRange,
): Promise<AccountSnapshot> {
  if (!client.googleCustomerId) {
    throw new Error(`Client ${client.slug} has no googleCustomerId`);
  }
  const customerId = normalizeCustomerId(client.googleCustomerId);
  // Per-platform override: a client can measure link_clicks on Meta but
  // track restaurant visits / GET_DIRECTIONS on Google. When googleFocusMetrics
  // is set it takes precedence; otherwise fall back to the shared focusMetrics.
  const focus = client.focusMetrics ?? client.focusMetrics ?? ["results", "link_clicks"];
  const { since, until } = pickTimeRange(timeRange);

  // Base query — pull all_conversions (PMax uses primary conversions;
  // other channels often don't have their goals set as primary, so
  // metrics.conversions reads zero). all_conversions captures every
  // tracked conversion, which is what the Google Ads UI's "All conv."
  // column shows.
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign_budget.amount_micros,
      campaign_budget.period,
      ${GOOGLE_METRIC_SELECTORS}
    FROM campaign
    WHERE segments.date BETWEEN '${since}' AND '${until}'
      AND campaign.status IN ('ENABLED', 'PAUSED')
  `;
  const rows = await searchStream<CampaignRow>(customerId, query);

  // If the client has `googleConversionCategories` set (e.g. KAB only
  // counts PURCHASE), run a second query segmented by conversion action
  // category. This filters out noise like view_item / add_to_cart /
  // page_view that otherwise inflate all_conversions. Per-campaign
  // totals from this query override the base results.
  const categoryFilteredByCampaign = new Map<string, number>();
  // Category-filtered conversion VALUE per campaign — parallels the count map
  // above. Surfaced as `purchase_value` in the campaign metrics dict.
  const categoryFilteredValueByCampaign = new Map<string, number>();
  const categories = client.googleConversionCategories ?? [];
  if (categories.length > 0) {
    const cats = categories.map((c) => `'${c}'`).join(",");
    const convQuery = `
      SELECT
        campaign.id,
        segments.conversion_action_category,
        metrics.all_conversions,
        metrics.all_conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${since}' AND '${until}'
        AND campaign.status IN ('ENABLED', 'PAUSED')
        AND segments.conversion_action_category IN (${cats})
    `;
    try {
      type ConvRow = { campaign: { id: string }; metrics?: { allConversions?: number | string; allConversionsValue?: number | string } };
      const convRows = await searchStream<ConvRow>(customerId, convQuery);
      for (const row of convRows) {
        const id = row.campaign.id;
        const v = toNum(row.metrics?.allConversions);
        categoryFilteredByCampaign.set(id, (categoryFilteredByCampaign.get(id) ?? 0) + v);
        const val = toNum(row.metrics?.allConversionsValue);
        categoryFilteredValueByCampaign.set(id, (categoryFilteredValueByCampaign.get(id) ?? 0) + val);
      }
    } catch (err) {
      console.error(`[google/${client.slug}] category filter query failed, falling back to all_conversions:`, err);
    }
  }

  const byCampaign = new Map<string, {
    name: string;
    status: string;
    budget: number | null;
    spend: number;
    impressions: number;
    clicks: number;
    cpcSum: number;
    allConversions: number;
    engagement: number;
    /** Accumulator for full per-metric totals, keyed by dashboard metric id. */
    metrics: Record<string, number>;
  }>();

  /**
   * Accumulate a per-row Google metrics dict into the per-campaign total.
   * Rates (ctr, conversion_rate, interaction_rate, *_percentage) are averaged
   * weighted by impressions so multi-day rollups don't just sum percentages.
   */
  const RATE_KEYS = new Set<string>([
    "ctr",
    "conversion_rate",
    "engagement_rate",
    "interaction_rate",
    "top_impression_percentage",
    "absolute_top_impression_percentage",
    "all_conversions_value_per_cost",
  ]);

  for (const row of rows) {
    const id = row.campaign.id;
    const prev = byCampaign.get(id) ?? {
      name: row.campaign.name,
      status: row.campaign.status,
      budget: row.campaignBudget?.amountMicros ? micros(row.campaignBudget.amountMicros) : null,
      spend: 0,
      impressions: 0,
      clicks: 0,
      cpcSum: 0,
      allConversions: 0,
      engagement: 0,
      metrics: {} as Record<string, number>,
    };
    prev.spend += micros(row.metrics?.costMicros);
    const dayImpressions = toNum(row.metrics?.impressions);
    prev.impressions += dayImpressions;
    const dayClicks = toNum(row.metrics?.clicks);
    prev.clicks += dayClicks;
    const dayCpc = micros(row.metrics?.averageCpc);
    if (dayCpc > 0) prev.cpcSum += dayCpc * dayClicks;
    prev.allConversions += toNum(row.metrics?.allConversions);
    prev.engagement += toNum(row.metrics?.engagements);

    // Merge the full metrics dict. Summable values are added; rate-like values
    // are impression-weighted so the final divide gives a true average.
    const dict = toGoogleMetricsDict(row.metrics);
    for (const [k, v] of Object.entries(dict)) {
      if (RATE_KEYS.has(k)) {
        const weighted = v * (dayImpressions || 1);
        prev.metrics[`__${k}_weighted`] = (prev.metrics[`__${k}_weighted`] ?? 0) + weighted;
        prev.metrics[`__${k}_weight`] = (prev.metrics[`__${k}_weight`] ?? 0) + (dayImpressions || 1);
      } else {
        prev.metrics[k] = (prev.metrics[k] ?? 0) + v;
      }
    }
    byCampaign.set(id, prev);
  }

  /** Resolve the `__key_weighted / __key_weight` accumulators into a single rate. */
  const resolveRates = (m: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(m)) {
      if (k.startsWith("__") && k.endsWith("_weighted")) {
        const base = k.slice(2, -"_weighted".length);
        const weight = m[`__${base}_weight`] ?? 0;
        if (weight > 0) out[base] = v / weight;
      } else if (!k.startsWith("__")) {
        out[k] = v;
      }
    }
    return out;
  };

  // ─── Ad enrichment ────────────────────────────────────────────────
  // Pull spending ads with their ad_group, capped to top spenders to keep
  // payload bounded. Mirrors meta.ts's MAX_ADS_PER_ACCOUNT pattern.
  // Note: when segments.date is NOT in SELECT, GAQL aggregates metrics
  // across the WHERE range — one row per ad, no local accumulator needed.
  const MAX_ADS_PER_ACCOUNT = 400;
  const adsByCampaign = new Map<string, Ad[]>();
  try {
    const adQuery = `
      SELECT
        campaign.id,
        ad_group.id,
        ad_group.name,
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        ad_group_ad.status,
        ${GOOGLE_METRIC_SELECTORS}
      FROM ad_group_ad
      WHERE segments.date BETWEEN '${since}' AND '${until}'
        AND ad_group_ad.status IN ('ENABLED', 'PAUSED')
        AND metrics.cost_micros > 0
      ORDER BY metrics.cost_micros DESC
      LIMIT ${MAX_ADS_PER_ACCOUNT}
    `;
    const adRows = await searchStream<AdGroupAdRow>(customerId, adQuery);

    // Resolve creatives per ad. Image/video ads → thumbnail; search ads →
    // SERP-style text preview (headlines/descriptions/URL) + account
    // extensions. All best-effort, never blocks the spend ingest.
    const adIds = adRows
      .map((r) => r.adGroupAd?.ad?.id)
      .filter((x): x is string => !!x);
    const thumbByAdId = await fetchAdThumbnails(customerId, adIds);
    const searchByAdId = await fetchSearchAdContent(customerId, adIds);
    const extensions = searchByAdId.size > 0
      ? await fetchAccountExtensions(customerId)
      : { sitelinks: [], phone: null };

    for (const row of adRows) {
      const adId = row.adGroupAd?.ad?.id;
      if (!adId) continue;

      const spend = micros(row.metrics?.costMicros);
      const impressions = toNum(row.metrics?.impressions);
      const clicks = toNum(row.metrics?.clicks);
      const cpc = row.metrics?.averageCpc ? micros(row.metrics.averageCpc) : null;
      const allConversions = toNum(row.metrics?.allConversions);
      const engagement = toNum(row.metrics?.engagements);

      // Mirror the campaign-level focus resolution. Per-category conversion
      // filtering (googleConversionCategories) isn't applied at ad level —
      // would need a second query segmented by conversion_action_category.
      let results = 0;
      let adResultType: string | null = null;
      const seekConv = focus.some((f) => f === "purchases" || f === "lead" || f === "results");
      if (seekConv) {
        results = allConversions;
        adResultType = "google:all_conversions";
      } else if (focus.includes("link_clicks")) {
        results = clicks;
        adResultType = "google:click";
      } else if (focus.includes("engagement")) {
        if (engagement > 0) {
          results = engagement;
          adResultType = "google:engagement";
        } else if (clicks > 0) {
          results = clicks;
          adResultType = "google:click";
        }
      } else {
        results = allConversions;
        adResultType = "google:all_conversions";
      }

      const costPerResult = results > 0 ? spend / results : null;
      const status = row.adGroupAd.status === "ENABLED" ? "ACTIVE" : row.adGroupAd.status;
      const search = searchByAdId.get(adId);
      // Search ads have no native name — use the first headline so the card
      // reads "Kabrita, Fórmula Suave" instead of "Ad 800186429663".
      const name = row.adGroupAd.ad.name || search?.headlines[0] || `Ad ${adId}`;

      const ad: Ad = {
        id: adId,
        accountId: customerId,
        name,
        campaignName: null,
        adsetName: row.adGroup?.name ?? null,
        adsetId: row.adGroup?.id ?? null,
        status,
        spend,
        impressions,
        clicks,
        ctr: null,
        cpc,
        results,
        resultType: results > 0 ? adResultType : null,
        costPerResult,
        engagement,
        // Image/video creatives resolved via ad_group_ad_asset_view. RSA
        // (search) has no creative image → stays null, UI shows a placeholder.
        thumbnailUrl: thumbByAdId.get(adId) ?? null,
        // Search ads carry a SERP-style text preview instead of an image.
        searchPreview: search
          ? {
              displayUrl: search.displayUrl,
              headlines: search.headlines.slice(0, 6),
              descriptions: search.descriptions.slice(0, 3),
              sitelinks: extensions.sitelinks.slice(0, 6),
              phone: extensions.phone,
            }
          : undefined,
        landingUrl: row.adGroupAd.ad.finalUrls?.[0] ?? null,
        platform: "google",
        metrics: toGoogleMetricsDict(row.metrics),
      };

      const cid = row.campaign.id;
      if (!adsByCampaign.has(cid)) adsByCampaign.set(cid, []);
      adsByCampaign.get(cid)!.push(ad);
    }

    if (adRows.length >= MAX_ADS_PER_ACCOUNT) {
      console.log(`[google/${client.slug}] ad enrichment hit ${MAX_ADS_PER_ACCOUNT} cap, top spenders only`);
    }
  } catch (err) {
    console.error(`[google/${client.slug}] ads enrichment failed:`, err);
  }

  // ─── PMax enrichment ────────────────────────────────────────────────
  // Performance Max campaigns don't have ad_groups + ads. Their leaf is
  // `asset_group`. Pull asset_group rows and synthesize "ad" entries so
  // the markup hierarchy (campaign → adset → ad) maps cleanly:
  //   campaign     → campaign
  //   adset (level)→ asset_group  (per-asset-group markup)
  //   ad (level)   → same asset_group id (PMax has no per-asset spend
  //                  reported at this layer; the asset_group IS the leaf
  //                  for markup purposes — setting ad-level == adset-level
  //                  yields the same result for PMax)
  //
  // Without this, PMax campaigns appear at campaign level only and the
  // ▸ expand returns 0 adsets even though the campaign has spend.
  try {
    // Slim metric selector — `asset_group` rejects engagement_rate,
    // interaction_rate, interactions, top_impression_percentage, and a
    // few other Display/Discovery-specific metrics with PROHIBITED_METRIC.
    // Keep only metrics that PMax actually reports at this layer.
    // Verified set as of 2026-06: asset_group rejects average_cpm,
    // engagement_rate, engagements, interaction_rate, interactions,
    // top_impression_percentage, absolute_top_impression_percentage
    // with PROHIBITED_METRIC_IN_SELECT_OR_WHERE_CLAUSE.
    const ASSET_GROUP_METRICS = [
      "metrics.cost_micros",
      "metrics.impressions",
      "metrics.clicks",
      "metrics.ctr",
      "metrics.average_cpc",
      "metrics.conversions",
      "metrics.conversions_value",
      "metrics.cost_per_conversion",
      "metrics.all_conversions",
      "metrics.all_conversions_value",
      "metrics.cost_per_all_conversions",
      "metrics.view_through_conversions",
    ].join(",\n      ");
    const assetGroupQuery = `
      SELECT
        campaign.id,
        asset_group.id,
        asset_group.name,
        asset_group.status,
        ${ASSET_GROUP_METRICS}
      FROM asset_group
      WHERE segments.date BETWEEN '${since}' AND '${until}'
        AND metrics.cost_micros > 0
    `;
    const agRows = await searchStream<AssetGroupRow>(customerId, assetGroupQuery);
    // PMax has no per-ad creative — pull the asset group's marketing image.
    const thumbByAssetGroup = await fetchAssetGroupThumbnails(customerId);
    for (const row of agRows) {
      const agId = row.assetGroup?.id;
      if (!agId) continue;
      const spend = micros(row.metrics?.costMicros);
      const impressions = toNum(row.metrics?.impressions);
      const clicks = toNum(row.metrics?.clicks);
      const cpc = row.metrics?.averageCpc ? micros(row.metrics.averageCpc) : null;
      const allConversions = toNum(row.metrics?.allConversions);
      const engagement = toNum(row.metrics?.engagements);

      let results = 0;
      let adResultType: string | null = null;
      const seekConv = focus.some((f) => f === "purchases" || f === "lead" || f === "results");
      if (seekConv) { results = allConversions; adResultType = "google:all_conversions"; }
      else if (focus.includes("link_clicks")) { results = clicks; adResultType = "google:click"; }
      else if (focus.includes("engagement")) {
        if (engagement > 0) { results = engagement; adResultType = "google:engagement"; }
        else if (clicks > 0) { results = clicks; adResultType = "google:click"; }
      } else { results = allConversions; adResultType = "google:all_conversions"; }

      const costPerResult = results > 0 ? spend / results : null;
      const status = row.assetGroup.status === "ENABLED" ? "ACTIVE" : row.assetGroup.status;

      const ad: Ad = {
        id: agId,
        accountId: customerId,
        name: row.assetGroup.name || `Asset group ${agId}`,
        campaignName: null,
        adsetName: row.assetGroup.name || `Asset group ${agId}`,
        adsetId: agId,
        status,
        spend,
        impressions,
        clicks,
        ctr: null,
        cpc,
        results,
        resultType: results > 0 ? adResultType : null,
        costPerResult,
        engagement,
        thumbnailUrl: thumbByAssetGroup.get(agId) ?? null,
        landingUrl: row.assetGroup.finalUrls?.[0] ?? null,
        platform: "google",
        metrics: toGoogleMetricsDict(row.metrics),
      };

      const cid = row.campaign.id;
      if (!adsByCampaign.has(cid)) adsByCampaign.set(cid, []);
      adsByCampaign.get(cid)!.push(ad);
    }
  } catch (err) {
    console.error(`[google/${client.slug}] asset_group enrichment failed:`, err);
  }

  const campaigns: Campaign[] = [];

  for (const [id, agg] of byCampaign) {
    // Results = conversions. If a category filter is configured, use the
    // filtered count (PURCHASE-only, LEAD-only, etc.). Otherwise use the
    // full all_conversions total.
    //
    // link_clicks / engagement focus still override to clicks / engagements
    // since those clients aren't measuring conversions as results.
    let results = 0;
    let campaignResultType: string | null = null;

    // Conversion-seeking is ALWAYS the primary signal when present —
    // even if the client also has engagement/link_clicks in focusMetrics.
    // Purchases are worth more than engagements; we report conversions
    // regardless of other secondary focuses.
    const seekConv = focus.some((f) => f === "purchases" || f === "lead" || f === "results");

    if (seekConv) {
      if (categories.length > 0) {
        results = categoryFilteredByCampaign.get(id) ?? 0;
        campaignResultType = `google:${categories.join("+").toLowerCase()}`;
      } else {
        results = agg.allConversions;
        campaignResultType = "google:all_conversions";
      }
    } else if (focus.includes("link_clicks")) {
      results = agg.clicks;
      campaignResultType = "google:click";
    } else if (focus.includes("engagement")) {
      if (agg.engagement > 0) {
        results = agg.engagement;
        campaignResultType = "google:engagement";
      } else if (agg.clicks > 0) {
        results = agg.clicks;
        campaignResultType = "google:click";
      }
    } else {
      // Fallback — default to conversions path
      if (categories.length > 0) {
        results = categoryFilteredByCampaign.get(id) ?? 0;
        campaignResultType = `google:${categories.join("+").toLowerCase()}`;
      } else {
        results = agg.allConversions;
        campaignResultType = "google:all_conversions";
      }
    }

    const cpc = agg.clicks > 0 ? agg.cpcSum / agg.clicks : null;
    const costPerResult = results > 0 ? agg.spend / results : null;

    // Normalize Google's ENABLED → ACTIVE to match Meta for frontend consistency.
    const status = agg.status === "ENABLED" ? "ACTIVE" : agg.status;

    // Resolve the per-campaign metrics dict, then — when a conversion-category
    // filter is configured — surface the category-filtered count + value as
    // dedicated keys (purchase_conversions / purchase_value). Additive: does
    // not touch results/conversions handling above.
    const campaignMetrics = resolveRates(agg.metrics);
    if (categories.length > 0) {
      const pc = categoryFilteredByCampaign.get(id) ?? 0;
      const pv = categoryFilteredValueByCampaign.get(id) ?? 0;
      if (pc !== 0) campaignMetrics["purchase_conversions"] = pc;
      if (pv !== 0) campaignMetrics["purchase_value"] = pv;
    }

    campaigns.push({
      id,
      name: agg.name,
      status,
      spend: agg.spend,
      budget: agg.budget,
      impressions: agg.impressions || null,
      clicks: agg.clicks || null,
      cpc,
      results: results || 0,
      resultType: results > 0 ? campaignResultType : null,
      costPerResult,
      engagement: agg.engagement || null,
      ads: (adsByCampaign.get(id) ?? []).map((ad) => ({ ...ad, campaignName: agg.name })),
      metrics: campaignMetrics,
    });
  }

  const activeCampaigns = campaigns.filter((c) => (c.spend ?? 0) > 0 || ((c.ads?.length ?? 0) > 0));

  const totalSpend = activeCampaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalResults = activeCampaigns.reduce((s, c) => s + (c.results ?? 0), 0);
  const totalClicks = activeCampaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const totalEngagement = activeCampaigns.reduce((s, c) => s + (c.engagement ?? 0), 0);

  // Pre-computed breakdowns disabled in Flint — Adglow serves them via live API.
  const breakdowns: import("@/lib/reports").AccountSnapshot["breakdowns"] = undefined;

  return {
    accountId: customerId,
    accountName: `${customerId} · ${client.name}`,
    clientSlug: client.slug,
    monthlyBudget: client.monthlyBudget?.google ?? null,
    mediaPlanUrl: client.mediaPlanUrl ?? null,
    focusMetrics: focus,
    totalSpend,
    spendExcluded: 0,
    totalBudget: client.monthlyBudget?.google ?? 0,
    totalResults,
    totalClicks,
    totalEngagement,
    campaigns: activeCampaigns,
    breakdowns,
  };
}

async function ingestWithRetry(
  client: ReportClient,
  timeRange?: GoogleTimeRange,
): Promise<AccountSnapshot> {
  try {
    return await ingestGoogleAccount(client, timeRange);
  } catch (err) {
    const msg = String(err);
    const isRateLimit = /RESOURCE_EXHAUSTED|429|quota/i.test(msg);
    if (!isRateLimit) throw err;
    console.log(`[google/${client.slug}] rate-limited, waiting 60s and retrying once…`);
    await new Promise((r) => setTimeout(r, 60_000));
    return await ingestGoogleAccount(client, timeRange);
  }
}

/**
 * Ingest one client's Google Ads account for a specific time range. Used by
 * the per-range report path (no DB write).
 */
export async function ingestGoogleAccountForRange(
  client: ReportClient,
  timeRange: GoogleTimeRange,
): Promise<AccountSnapshot> {
  return ingestWithRetry(client, timeRange);
}

export async function ingestAllGoogle(timeRange?: GoogleTimeRange): Promise<{
  accounts: AccountSnapshot[];
  errors: Array<{ clientSlug: string; error: string }>;
}> {
  const clients = await getAllClients();
  const withGoogle = clients.filter((c) => c.googleCustomerId);

  const accounts: AccountSnapshot[] = [];
  const errors: Array<{ clientSlug: string; error: string }> = [];

  for (const c of withGoogle) {
    try {
      accounts.push(await ingestWithRetry(c, timeRange));
    } catch (err) {
      // Keep more of the error text — Google Ads failures include a
      // nested GoogleAdsFailure that names the offending selector, which
      // trimming at 300 chars was hiding.
      errors.push({ clientSlug: c.slug, error: String(err).slice(0, 1500) });
    }
  }

  return { accounts, errors };
}
