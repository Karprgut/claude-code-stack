/**
 * TikTok Marketing API ingestion for the client reports feature.
 * Mirrors meta.ts: per-client access token from `ad_clients.tiktokAccessToken`.
 *
 * We return an `AccountSnapshot` shaped like the Meta path so the UI and
 * downstream consumers don't need to branch on platform.
 */

import type {
  AccountSnapshot,
  Campaign,
  Ad,
  ReportClient,
} from "../reports";
import { getDb, COLLECTIONS } from "../mongodb";
import type { AdClientConfig } from "../ad-clients";

const BASE = "https://business-api.tiktok.com/open_api/v1.3";

export interface TiktokTimeRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

// ─── Helpers ──────────────────────────────────────────────────────────

// Date ranges follow the ad account's operating timezone (MX) — using UTC
// here was rolling the "this month" range over to the next month around
// 18:00 MX and returning $0 until the next day's spend. Meta isn't
// affected because its preset is account-TZ aware. Mirror of the same
// fix in reports-ingest/google.ts.
const REPORT_TZ = "America/Mexico_City";
function localYmd(): { year: number; month: number; day: number } {
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

export async function ttGet(path: string, params: Record<string, string>, accessToken: string): Promise<unknown> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Access-Token": accessToken },
  });
  if (!res.ok) {
    throw new Error(`TikTok ${res.status} ${path}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

function pickTimeRange(timeRange?: TiktokTimeRange): { since: string; until: string } {
  if (timeRange && /^\d{4}-\d{2}-\d{2}$/.test(timeRange.since) && /^\d{4}-\d{2}-\d{2}$/.test(timeRange.until)) {
    return { since: timeRange.since, until: timeRange.until };
  }
  return { since: firstOfMonthISO(), until: todayISO() };
}

// ─── TikTok response types ────────────────────────────────────────────

interface CampaignListResponse {
  code: number;
  message?: string;
  data?: {
    list?: Array<{
      campaign_id: string;
      campaign_name: string;
      operation_status: string;
      objective_type?: string;
    }>;
  };
}

interface ReportResponse {
  code: number;
  message?: string;
  data?: { list?: Array<{ dimensions?: Record<string, string>; metrics?: Record<string, string> }> };
}

interface ImageInfoResponse {
  code: number;
  data?: { list?: Array<{ image_id: string; image_url?: string; preview_url?: string }> };
}

interface VideoInfoResponse {
  code: number;
  data?: { list?: Array<{ video_id: string; video_cover_url?: string; preview_url?: string; poster_url?: string }> };
}

interface OembedResult { thumbnail_url?: string; author_name?: string; title?: string }

/** Batch-fetch image URLs by image_id (TikTok `/file/image/ad/info/`). */
async function resolveImageUrls(advertiserId: string, accessToken: string, imageIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (imageIds.length === 0) return map;
  // API caps batch to 100
  for (let i = 0; i < imageIds.length; i += 100) {
    const chunk = imageIds.slice(i, i + 100);
    try {
      const json = (await ttGet("/file/image/ad/info/", {
        advertiser_id: advertiserId,
        image_ids: JSON.stringify(chunk),
      }, accessToken)) as ImageInfoResponse;
      if (json.code !== 0) continue;
      for (const it of json.data?.list ?? []) {
        const url = it.preview_url || it.image_url;
        if (url) map.set(it.image_id, url);
      }
    } catch (err) {
      console.error("[tiktok/images] batch failed:", err);
    }
  }
  return map;
}

/** Batch-fetch video cover URLs by video_id. */
async function resolveVideoCovers(advertiserId: string, accessToken: string, videoIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (videoIds.length === 0) return map;
  try {
    const json = (await ttGet("/file/video/ad/info/", {
      advertiser_id: advertiserId,
      video_ids: JSON.stringify(videoIds),
    }, accessToken)) as VideoInfoResponse;
    if (json.code !== 0) return map;
    for (const v of json.data?.list ?? []) {
      const url = v.video_cover_url || v.poster_url || v.preview_url;
      if (url) map.set(v.video_id, url);
    }
  } catch (err) {
    console.error("[tiktok/videos] batch failed:", err);
  }
  return map;
}

/**
 * Spark Ads (boosts of organic posts) come back with empty image_ids and
 * no video_id — the only reference is `tiktok_item_id`. Public oEmbed
 * resolves to a thumbnail + author + title without auth.
 */
async function resolveSparkThumbnails(itemIds: string[]): Promise<Map<string, OembedResult>> {
  const map = new Map<string, OembedResult>();
  if (itemIds.length === 0) return map;
  const results = await Promise.allSettled(itemIds.map(async (id) => {
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=https://www.tiktok.com/video/${id}`);
      if (!res.ok) return [id, null] as const;
      const json = (await res.json()) as OembedResult;
      return [id, json] as const;
    } catch {
      return [id, null] as const;
    }
  }));
  for (const r of results) {
    if (r.status === "fulfilled" && r.value[1]) map.set(r.value[0], r.value[1]);
  }
  return map;
}

interface AdListResponse {
  code: number;
  message?: string;
  data?: {
    list?: Array<{
      ad_id: string;
      ad_name: string;
      campaign_id?: string;
      campaign_name?: string;
      adgroup_id?: string;
      adgroup_name?: string;
      operation_status?: string;
      image_ids?: string[];
      video_id?: string;
      landing_page_url?: string;
      tiktok_item_id?: string;
    }>;
  };
}

// ─── Helpers: metadata fetchers ───────────────────────────────────────

async function getCampaignMeta(advertiserId: string, token: string): Promise<Map<string, { name: string; status: string; objective: string | null }>> {
  const map = new Map<string, { name: string; status: string; objective: string | null }>();
  let page = 1;
  while (true) {
    const json = (await ttGet("/campaign/get/", {
      advertiser_id: advertiserId,
      page: String(page),
      page_size: "100",
    }, token)) as CampaignListResponse;
    if (json.code !== 0) break;
    const list = json.data?.list ?? [];
    for (const c of list) {
      map.set(c.campaign_id, {
        name: c.campaign_name,
        status: c.operation_status,
        objective: c.objective_type ?? null,
      });
    }
    if (list.length < 100) break;
    page++;
    if (page > 20) break;
  }
  return map;
}

async function getAdMeta(advertiserId: string, token: string): Promise<Map<string, NonNullable<NonNullable<AdListResponse["data"]>["list"]>[number]>> {
  const map = new Map<string, NonNullable<NonNullable<AdListResponse["data"]>["list"]>[number]>();
  let page = 1;
  while (true) {
    const json = (await ttGet("/ad/get/", {
      advertiser_id: advertiserId,
      page: String(page),
      page_size: "100",
    }, token)) as AdListResponse;
    if (json.code !== 0) break;
    const list = json.data?.list ?? [];
    for (const a of list) map.set(a.ad_id, a);
    if (list.length < 100) break;
    page++;
    if (page > 20) break;
  }
  return map;
}

/**
 * TikTok metrics requested on every insights call. Covers Entrega+Costo,
 * Conversiones, y el equivalente de Thruplay (TikTok no tiene Thruplay
 * nominal — `engaged_view` es el "6s engaged view" que se usa en la
 * industria como proxy más cercano).
 *
 * Cualquier métrica que no aparezca con datos se filtra en el dashboard
 * vía `availableMetrics` (solo se muestra si algún row trae valor >0).
 */
const TIKTOK_METRICS = [
  // Entrega y costo
  "spend", "impressions", "clicks", "ctr", "cpc", "cpm", "reach", "frequency",
  // Acciones y conversiones. Note: `total_conversion` and
  // `total_conversion_value` are rejected by TikTok's report API despite
  // what some docs say — use `conversion` / `conversion_value` variants.
  "conversion", "conversion_rate", "cost_per_conversion",
  "result", "result_rate", "cost_per_result",
  "real_time_result", "real_time_cost_per_result",
  // Video (Thruplay-equivalente: engaged_view = 6s engaged)
  "engaged_view", "engaged_view_15s", "video_views_p100",
  "video_play_actions",
];

/**
 * Build a flat metrics dict from a TikTok report row, keyed by the same ids
 * the dashboard uses across platforms. Only non-zero values are stored.
 */
function toTiktokMetricsDict(m: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  const put = (k: string, raw: unknown) => {
    const n = Number(raw);
    if (Number.isFinite(n) && n !== 0) out[k] = n;
  };
  // TikTok returns rates as strings — keep them as-is (already in 0-100 or
  // fractional depending on field; dashboard formats handle that).
  put("spend", m.spend);
  put("impressions", m.impressions);
  put("clicks", m.clicks);
  put("ctr", m.ctr);
  put("cpc", m.cpc);
  put("cpm", m.cpm);
  put("reach", m.reach);
  put("frequency", m.frequency);

  put("conversion", m.conversion);
  put("conversion_rate", m.conversion_rate);
  put("cost_per_conversion", m.cost_per_conversion);
  put("total_conversion", m.total_conversion);
  put("total_conversion_value", m.total_conversion_value);
  put("result", m.result);
  put("result_rate", m.result_rate);
  put("cost_per_result", m.cost_per_result);
  put("real_time_result", m.real_time_result);
  put("real_time_cost_per_result", m.real_time_cost_per_result);

  // Thruplay-equivalent: engaged_view (6s). Keep the raw p100 + plays too so
  // the dashboard can surface them if the client wants completion signals.
  put("thruplay", m.engaged_view);
  put("engaged_view_15s", m.engaged_view_15s);
  put("video_views_p100", m.video_views_p100);
  put("video_play_actions", m.video_play_actions);

  return out;
}

function focusToMetric(focus: string[]): { metric: keyof ReportMetricPicks; resultType: string } {
  if (focus.includes("purchases") || focus.includes("results")) {
    return { metric: "conversion", resultType: "tiktok:conversion" };
  }
  if (focus.includes("lead")) return { metric: "conversion", resultType: "tiktok:lead" };
  if (focus.includes("link_clicks")) return { metric: "clicks", resultType: "tiktok:click" };
  if (focus.includes("engagement")) return { metric: "video_view", resultType: "tiktok:video_view" };
  return { metric: "conversion", resultType: "tiktok:conversion" };
}

interface ReportMetricPicks {
  conversion: number;
  clicks: number;
  video_view: number;
  reach: number;
}

function pickResults(metrics: Record<string, string>, which: keyof ReportMetricPicks): number {
  switch (which) {
    case "conversion":
      return toNum(metrics.conversion);
    case "clicks":
      return toNum(metrics.clicks);
    case "video_view":
      return toNum(metrics.video_play_actions ?? metrics.video_views);
    case "reach":
      return toNum(metrics.reach);
    default:
      return 0;
  }
}

// ─── Main: ingest one account ─────────────────────────────────────────

export async function ingestTiktokAccount(
  client: ReportClient,
  accessToken: string,
  timeRange?: TiktokTimeRange,
): Promise<AccountSnapshot> {
  if (!client.tiktokAdvertiserId) {
    throw new Error(`Client ${client.slug} has no tiktokAdvertiserId`);
  }
  const advertiserId = client.tiktokAdvertiserId;
  const focus = client.focusMetrics ?? client.focusMetrics ?? ["results", "link_clicks"];
  const { since, until } = pickTimeRange(timeRange);
  const { metric: primaryMetric, resultType } = focusToMetric(focus);

  const campaignMeta = await getCampaignMeta(advertiserId, accessToken);

  // Campaign-level report
  const campaignReport = (await ttGet("/report/integrated/get/", {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level: "AUCTION_CAMPAIGN",
    dimensions: JSON.stringify(["campaign_id"]),
    metrics: JSON.stringify(TIKTOK_METRICS),
    start_date: since,
    end_date: until,
    page_size: "1000",
  }, accessToken)) as ReportResponse;

  if (campaignReport.code !== 0) {
    throw new Error(`TikTok report error: ${campaignReport.message}`);
  }

  const campaignRows = campaignReport.data?.list ?? [];
  const campaigns: Campaign[] = campaignRows.map((r) => {
    const cid = r.dimensions?.campaign_id ?? "";
    const meta = campaignMeta.get(cid);
    const m = r.metrics ?? {};
    const spend = toNum(m.spend);
    const clicks = toNum(m.clicks);
    const results = pickResults(m, primaryMetric);
    const costPerResult = results > 0 ? spend / results : (m.cost_per_conversion ? Number(m.cost_per_conversion) : null);
    return {
      id: cid,
      name: meta?.name ?? cid,
      status: meta?.status ?? "UNKNOWN",
      spend,
      budget: null,
      impressions: toNum(m.impressions) || null,
      clicks: clicks || null,
      cpc: m.cpc ? Number(m.cpc) : null,
      results: results || 0,
      resultType: results > 0 ? resultType : null,
      costPerResult,
      engagement: toNum(m.video_play_actions ?? m.video_views) || null,
      ads: [],
      metrics: toTiktokMetricsDict(m),
    };
  });

  // Enrich with ads — best-effort, never fail the whole sync if ad endpoint errors
  try {
    const [adsMeta, adsReport] = await Promise.all([
      getAdMeta(advertiserId, accessToken),
      ttGet("/report/integrated/get/", {
        advertiser_id: advertiserId,
        report_type: "BASIC",
        data_level: "AUCTION_AD",
        dimensions: JSON.stringify(["ad_id"]),
        metrics: JSON.stringify(TIKTOK_METRICS),
        start_date: since,
        end_date: until,
        page_size: "1000",
      }, accessToken).then((j) => j as ReportResponse),
    ]);

    const adRows = (adsReport.data?.list ?? []).filter((r) => toNum(r.metrics?.spend) > 0);

    // Collect creative refs across all spending ads, then batch-resolve
    // thumbnails in three calls (images + videos + Spark oEmbed).
    const imageIds = new Set<string>();
    const videoIds = new Set<string>();
    const sparkIds = new Set<string>();
    for (const row of adRows) {
      const meta = adsMeta.get(row.dimensions?.ad_id ?? "");
      if (!meta) continue;
      for (const id of meta.image_ids ?? []) imageIds.add(id);
      if (meta.video_id) videoIds.add(meta.video_id);
      // Spark Ad: no image_ids AND no video_id but has tiktok_item_id
      if ((meta.image_ids ?? []).length === 0 && !meta.video_id && meta.tiktok_item_id) {
        sparkIds.add(meta.tiktok_item_id);
      }
    }
    const [imageMap, videoMap, sparkMap] = await Promise.all([
      resolveImageUrls(advertiserId, accessToken, [...imageIds]),
      resolveVideoCovers(advertiserId, accessToken, [...videoIds]),
      resolveSparkThumbnails([...sparkIds]),
    ]);

    const adsByCampaign = new Map<string, Ad[]>();
    for (const row of adRows) {
      const adId = row.dimensions?.ad_id ?? "";
      const meta = adsMeta.get(adId);
      if (!meta) continue;
      const m = row.metrics ?? {};
      const spend = toNum(m.spend);
      const clicks = toNum(m.clicks);
      const results = pickResults(m, primaryMetric);
      const costPerResult = results > 0 ? spend / results : (m.cost_per_conversion ? Number(m.cost_per_conversion) : null);

      // Resolve thumbnail in priority order: image → video cover → Spark oEmbed
      let thumbnailUrl: string | null = null;
      let isSparkAd = false;
      for (const id of meta.image_ids ?? []) {
        const url = imageMap.get(id);
        if (url) { thumbnailUrl = url; break; }
      }
      if (!thumbnailUrl && meta.video_id) {
        thumbnailUrl = videoMap.get(meta.video_id) ?? null;
      }
      if (!thumbnailUrl && meta.tiktok_item_id) {
        const oembed = sparkMap.get(meta.tiktok_item_id);
        if (oembed) {
          thumbnailUrl = oembed.thumbnail_url ?? null;
          isSparkAd = true;
        }
      }

      const ad: Ad = {
        id: adId,
        accountId: advertiserId,
        name: meta.ad_name,
        campaignName: meta.campaign_name ?? null,
        adsetName: meta.adgroup_name ?? null,
        adsetId: meta.adgroup_id ?? null,
        status: meta.operation_status ?? "UNKNOWN",
        spend,
        impressions: toNum(m.impressions),
        clicks,
        ctr: m.ctr ? Number(m.ctr) : null,
        cpc: m.cpc ? Number(m.cpc) : null,
        results,
        resultType: results > 0 ? resultType : null,
        costPerResult,
        engagement: toNum(m.video_play_actions ?? m.video_views),
        thumbnailUrl,
        landingUrl: meta.landing_page_url ?? null,
        platform: "tiktok",
        tiktokItemId: meta.tiktok_item_id ?? null,
        isSparkAd,
        metrics: toTiktokMetricsDict(m),
      };
      const cid = meta.campaign_id ?? "_unknown";
      if (!adsByCampaign.has(cid)) adsByCampaign.set(cid, []);
      adsByCampaign.get(cid)!.push(ad);
    }
    for (const c of campaigns) {
      if (c.id) c.ads = adsByCampaign.get(c.id) ?? [];
    }
  } catch (err) {
    console.error(`[tiktok/${client.slug}] ads enrichment failed:`, err);
  }

  const activeCampaigns = campaigns.filter((c) => (c.spend ?? 0) > 0 || ((c.ads?.length ?? 0) > 0));
  const totalSpend = activeCampaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalResults = activeCampaigns.reduce((s, c) => s + (c.results ?? 0), 0);
  const totalClicks = activeCampaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const totalEngagement = activeCampaigns.reduce((s, c) => s + (c.engagement ?? 0), 0);

  // Pre-computed breakdowns disabled in Flint — Adglow serves them via live API.
  const breakdowns: import("@/lib/reports").AccountSnapshot["breakdowns"] = undefined;

  return {
    accountId: advertiserId,
    accountName: `${advertiserId} · ${client.name}`,
    clientSlug: client.slug,
    monthlyBudget: client.monthlyBudget?.tiktok ?? null,
    mediaPlanUrl: client.mediaPlanUrl ?? null,
    focusMetrics: focus,
    totalSpend,
    spendExcluded: 0,
    totalBudget: client.monthlyBudget?.tiktok ?? 0,
    totalResults,
    totalClicks,
    totalEngagement,
    campaigns: activeCampaigns,
    breakdowns,
  };
}

async function ingestWithRetry(
  client: ReportClient,
  accessToken: string,
  timeRange?: TiktokTimeRange,
): Promise<AccountSnapshot> {
  try {
    return await ingestTiktokAccount(client, accessToken, timeRange);
  } catch (err) {
    const msg = String(err);
    const isRateLimit = /40100|rate limit|429/i.test(msg);
    if (!isRateLimit) throw err;
    console.log(`[tiktok/${client.slug}] rate-limited, waiting 60s and retrying once…`);
    await new Promise((r) => setTimeout(r, 60_000));
    return await ingestTiktokAccount(client, accessToken, timeRange);
  }
}

/**
 * Ingest one client's TikTok account for a specific time range. Used by the
 * per-range report path (no DB write).
 */
export async function ingestTiktokAccountForRange(
  client: ReportClient,
  accessToken: string,
  timeRange: TiktokTimeRange,
): Promise<AccountSnapshot> {
  return ingestWithRetry(client, accessToken, timeRange);
}

/**
 * Look up the TikTok access token for a given ReportClient. Stored on the
 * `ad_clients` doc, not in env.
 */
export async function getTiktokTokenForClient(slug: string): Promise<string | undefined> {
  const db = await getDb();
  const code = slug.toUpperCase();
  const doc = await db.collection<AdClientConfig>(COLLECTIONS.adClients).findOne({
    $or: [
      { _id: slug },
      { _id: code },
      { code: slug },
      { code },
    ],
  });
  return doc?.tiktokAccessToken;
}

export async function ingestAllTiktok(timeRange?: TiktokTimeRange): Promise<{
  accounts: AccountSnapshot[];
  errors: Array<{ clientSlug: string; error: string }>;
}> {
  const db = await getDb();
  const allDocs = await db
    .collection<AdClientConfig>(COLLECTIONS.adClients)
    .find({})
    .toArray();
  // Filter in memory — Mongo's typed Filter<AdClientConfig> rejects `$ne: null`
  // on optional string fields, and the collection is tiny.
  const docs = allDocs.filter((d) => !!d.tiktokAdvertiserId && !!d.tiktokAccessToken);

  const accounts: AccountSnapshot[] = [];
  const errors: Array<{ clientSlug: string; error: string }> = [];

  for (const doc of docs) {
    const code = (doc.code || doc._id || "").toString();
    const slug = code.toLowerCase();
    const client: ReportClient = {
      _id: slug,
      slug,
      code: code.toUpperCase(),
      name: doc.name,
      metaAccountId: doc.metaAccountId,
      metaTokenEnv: `META_TOKEN_${code.toUpperCase()}`,
      googleCustomerId: doc.googleCustomerId,
      tiktokAdvertiserId: doc.tiktokAdvertiserId,
      monthlyBudget: doc.monthlyBudget,
      focusMetrics: doc.focusMetrics,
      mediaPlanUrl: doc.mediaPlanUrl,
      notes: doc.notes,
    };
    if (!doc.tiktokAccessToken || !doc.tiktokAdvertiserId) {
      errors.push({ clientSlug: slug, error: "Missing TikTok credentials" });
      continue;
    }
    try {
      accounts.push(await ingestWithRetry(client, doc.tiktokAccessToken, timeRange));
    } catch (err) {
      errors.push({ clientSlug: slug, error: String(err).slice(0, 300) });
    }
  }

  return { accounts, errors };
}
