/**
 * Meta Marketing API ingestion for the client reports feature.
 * Uses per-client System User tokens (META_TOKEN_<CODE>) — one per ad_clients
 * entry. Flint's standard pattern.
 */

import type {
  AccountSnapshot,
  Campaign,
  Ad,
  ReportClient,
} from "../reports";
import { getAllClients, getMetaTokenForClient } from "../reports";

const API_VERSION = "v21.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

// ─── Helpers ──────────────────────────────────────────────────────────

async function fbGet<T = unknown>(path: string, params: Record<string, string>, token: string): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta ${res.status} ${path}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

interface Paginated<T> { data: T[]; paging?: { cursors?: { after?: string }; next?: string } }

async function fbGetAll<T>(path: string, params: Record<string, string>, token: string): Promise<T[]> {
  const results: T[] = [];
  let after: string | undefined;
  let safety = 0;
  do {
    const page: Paginated<T> = await fbGet(path, { ...params, ...(after ? { after } : {}) }, token);
    results.push(...page.data);
    after = page.paging?.cursors?.after;
    if (!page.paging?.next) after = undefined;
    safety++;
  } while (after && safety < 50);
  return results;
}

function num(v: unknown): number { return v == null ? 0 : Number(v) || 0; }

async function batchGetByIds<T>(ids: string[], fields: string, token: string): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const json = await fbGet<Record<string, T>>("", {
      ids: chunk.join(","),
      fields,
    }, token);
    for (const id of chunk) {
      const v = (json as Record<string, T>)[id];
      if (v) out.push(v);
    }
  }
  return out;
}

function extractPrimaryAction(
  actions: Array<{ action_type: string; value: string }> | undefined,
  focus: string[],
): { count: number; resultType: string | null } {
  if (!actions || actions.length === 0) return { count: 0, resultType: null };
  const byType = new Map(actions.map((a) => [a.action_type, Number(a.value) || 0]));

  const primaryOrder: Array<{ keys: string[]; resultType: string; focus: string }> = [
    { keys: ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"], resultType: "meta:purchase", focus: "purchases" },
    { keys: ["lead", "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead_grouped"], resultType: "meta:lead", focus: "lead" },
    { keys: ["link_click"], resultType: "meta:link_click", focus: "link_clicks" },
    { keys: ["post_engagement"], resultType: "meta:engagement", focus: "engagement" },
  ];

  for (const p of primaryOrder) {
    if (focus.includes(p.focus)) {
      for (const k of p.keys) {
        const v = byType.get(k);
        if (v != null && v > 0) return { count: v, resultType: p.resultType };
      }
    }
  }

  for (const p of primaryOrder) {
    for (const k of p.keys) {
      const v = byType.get(k);
      if (v != null && v > 0) return { count: v, resultType: p.resultType };
    }
  }
  return { count: 0, resultType: null };
}

// ─── Types for Meta API payloads ──────────────────────────────────────

interface MetaCampaignConfig {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface MetaInsight {
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  // Entrega y costo
  spend?: string;
  social_spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  clicks?: string;
  cpm?: string;
  cpc?: string;
  cpp?: string;
  ctr?: string;
  unique_ctr?: string;
  unique_clicks?: string;
  inline_link_clicks?: string;
  inline_link_click_ctr?: string;
  outbound_clicks?: Array<{ action_type: string; value: string }>;
  outbound_clicks_ctr?: Array<{ action_type: string; value: string }>;
  unique_outbound_clicks?: Array<{ action_type: string; value: string }>;
  cost_per_inline_link_click?: string;
  cost_per_inline_post_engagement?: string;
  cost_per_unique_click?: string;
  // Acciones y conversiones
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  conversions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  cost_per_conversion?: Array<{ action_type: string; value: string }>;
  cost_per_unique_action_type?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ action_type: string; value: string }>;
  website_purchase_roas?: Array<{ action_type: string; value: string }>;
  mobile_app_purchase_roas?: Array<{ action_type: string; value: string }>;
  // Video (solo Thruplay, por preferencia del dashboard)
  video_thruplay_watched_actions?: Array<{ action_type: string; value: string }>;
}

/**
 * Comma-separated list of Meta Insights fields requested on every call.
 * Covers Entrega+Costo, Conversiones, y Thruplay. `actions` is a generic
 * envelope that contains post_engagement / link_click / video_view / lead /
 * purchase etc. — expanded later into the metrics dict.
 */
export const META_INSIGHTS_FIELDS = [
  // Entrega y costo
  "spend", "social_spend",
  "impressions", "reach", "frequency",
  "clicks", "cpm", "cpc", "cpp", "ctr",
  "unique_ctr", "unique_clicks",
  "inline_link_clicks", "inline_link_click_ctr",
  "outbound_clicks", "outbound_clicks_ctr", "unique_outbound_clicks",
  "cost_per_inline_link_click", "cost_per_inline_post_engagement",
  "cost_per_unique_click",
  // Acciones y conversiones
  "actions", "action_values", "conversions",
  "cost_per_action_type", "cost_per_conversion", "cost_per_unique_action_type",
  "purchase_roas", "website_purchase_roas", "mobile_app_purchase_roas",
  // Video (Thruplay)
  "video_thruplay_watched_actions",
].join(",");

/**
 * Flatten a MetaInsight response into a flat `Record<string, number>` suitable
 * for `Campaign.metrics` / `Ad.metrics`. Keys are normalized so the dashboard
 * can pick them by a stable id (e.g. "action:purchase", "roas:purchase").
 *
 * Only non-zero numeric values are stored — this is what lets the dashboard
 * show only "las que tengan datos" without extra filtering logic.
 */
export function toMetaMetricsDict(i: MetaInsight): Record<string, number> {
  const out: Record<string, number> = {};
  const put = (k: string, v: unknown) => {
    const n = Number(v);
    if (Number.isFinite(n) && n !== 0) out[k] = n;
  };

  // Scalar fields
  put("spend", i.spend);
  put("social_spend", i.social_spend);
  put("impressions", i.impressions);
  put("reach", i.reach);
  put("frequency", i.frequency);
  put("clicks", i.clicks);
  put("cpm", i.cpm);
  put("cpc", i.cpc);
  put("cpp", i.cpp);
  put("ctr", i.ctr);
  put("unique_ctr", i.unique_ctr);
  put("unique_clicks", i.unique_clicks);
  put("inline_link_clicks", i.inline_link_clicks);
  put("inline_link_click_ctr", i.inline_link_click_ctr);
  put("cost_per_inline_link_click", i.cost_per_inline_link_click);
  put("cost_per_inline_post_engagement", i.cost_per_inline_post_engagement);
  put("cost_per_unique_click", i.cost_per_unique_click);

  // Array-of-action fields — sum values and also expose per-type breakdown
  const sumActionArray = (label: string, arr: Array<{ action_type: string; value: string }> | undefined) => {
    if (!arr || arr.length === 0) return;
    let total = 0;
    for (const a of arr) {
      const n = Number(a.value);
      if (Number.isFinite(n)) {
        total += n;
        put(`${label}:${a.action_type}`, n);
      }
    }
    if (total !== 0) out[label] = total;
  };

  sumActionArray("outbound_clicks", i.outbound_clicks);
  sumActionArray("outbound_clicks_ctr", i.outbound_clicks_ctr);
  sumActionArray("unique_outbound_clicks", i.unique_outbound_clicks);
  sumActionArray("action", i.actions);
  sumActionArray("action_value", i.action_values);
  sumActionArray("conversion", i.conversions);
  sumActionArray("cost_per_action", i.cost_per_action_type);
  sumActionArray("cost_per_conversion", i.cost_per_conversion);
  sumActionArray("cost_per_unique_action", i.cost_per_unique_action_type);
  sumActionArray("purchase_roas", i.purchase_roas);
  sumActionArray("website_purchase_roas", i.website_purchase_roas);
  sumActionArray("mobile_app_purchase_roas", i.mobile_app_purchase_roas);
  sumActionArray("thruplay", i.video_thruplay_watched_actions);

  return out;
}

interface MetaAdPayload {
  id: string;
  name: string;
  status: string;
  campaign_id?: string;
  adset_id?: string;
  // The ad node has no flat `adset_name` field (Meta returns #100). The adset
  // name comes via field expansion `adset{name}` — see batchGetByIds call below.
  adset?: { id?: string; name?: string };
  creative?: {
    id?: string;
    thumbnail_url?: string;
    image_url?: string;
    title?: string;
    body?: string;
  };
}

// ─── Main: ingest one account ─────────────────────────────────────────

const MAX_CAMPAIGNS_PER_ACCOUNT = 150;
const MAX_ADS_PER_ACCOUNT = 400;

export interface MetaTimeRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

/**
 * Build insights-query params for a given time window. If timeRange is
 * provided, uses `time_range={"since":"...","until":"..."}`. Otherwise
 * falls back to the legacy `date_preset=this_month`.
 */
function timeParams(timeRange?: MetaTimeRange): Record<string, string> {
  if (timeRange && /^\d{4}-\d{2}-\d{2}$/.test(timeRange.since) && /^\d{4}-\d{2}-\d{2}$/.test(timeRange.until)) {
    return { time_range: JSON.stringify({ since: timeRange.since, until: timeRange.until }) };
  }
  return { date_preset: "this_month" };
}

export async function ingestMetaAccount(
  client: ReportClient,
  token: string,
  timeRange?: MetaTimeRange,
): Promise<AccountSnapshot> {
  if (!client.metaAccountId) {
    throw new Error(`Client ${client.slug} has no metaAccountId`);
  }
  const accountId = client.metaAccountId;
  const focus = client.focusMetrics ?? client.focusMetrics ?? ["purchases", "link_clicks"];

  const campaignInsights = await fbGetAll<MetaInsight>(`/${accountId}/insights`, {
    level: "campaign",
    ...timeParams(timeRange),
    fields: `campaign_id,${META_INSIGHTS_FIELDS}`,
    limit: "500",
  }, token);

  const rankedCampaigns = [...campaignInsights]
    .filter((i) => !!i.campaign_id)
    .sort((a, b) => num(b.spend) - num(a.spend))
    .slice(0, MAX_CAMPAIGNS_PER_ACCOUNT);
  const topCampaignIds = new Set(rankedCampaigns.map((i) => i.campaign_id!));
  const insightsByCampaign = new Map(rankedCampaigns.map((i) => [i.campaign_id, i]));

  if (campaignInsights.length > MAX_CAMPAIGNS_PER_ACCOUNT) {
    console.log(`[meta/${client.slug}] ${campaignInsights.length} campaigns this month, capped to top ${MAX_CAMPAIGNS_PER_ACCOUNT} by spend`);
  }

  const campaigns: MetaCampaignConfig[] = topCampaignIds.size > 0
    ? await batchGetByIds<MetaCampaignConfig>(
        [...topCampaignIds],
        "id,name,status,objective,daily_budget,lifetime_budget",
        token,
      )
    : [];

  const adInsights = topCampaignIds.size > 0
    ? await fbGetAll<MetaInsight>(`/${accountId}/insights`, {
        level: "ad",
        ...timeParams(timeRange),
        filtering: JSON.stringify([{ field: "campaign.id", operator: "IN", value: [...topCampaignIds] }]),
        fields: `ad_id,campaign_id,${META_INSIGHTS_FIELDS}`,
        limit: "500",
      }, token)
    : [];

  const rankedAdInsights = [...adInsights]
    .filter((i) => !!i.ad_id && num(i.spend) > 0)
    .sort((a, b) => num(b.spend) - num(a.spend))
    .slice(0, MAX_ADS_PER_ACCOUNT);

  if (adInsights.length > MAX_ADS_PER_ACCOUNT) {
    console.log(`[meta/${client.slug}] ${adInsights.length} ads with spend, capped to top ${MAX_ADS_PER_ACCOUNT}`);
  }

  const topAdIds = rankedAdInsights.map((i) => i.ad_id!).filter((x): x is string => !!x);
  const adsById = new Map<string, MetaAdPayload>();
  if (topAdIds.length > 0) {
    const adPayloads = await batchGetByIds<MetaAdPayload>(
      topAdIds,
      "id,name,status,campaign_id,adset_id,adset{name},creative{thumbnail_url,image_url,title,body}",
      token,
    );
    for (const ad of adPayloads) adsById.set(ad.id, ad);
  }

  const adsByCampaign = new Map<string, Ad[]>();
  for (const i of rankedAdInsights) {
    const spend = num(i.spend);
    if (spend <= 0) continue;
    const meta = adsById.get(i.ad_id ?? "");
    if (!meta) continue;
    const primary = extractPrimaryAction(i.actions, focus);
    const costMap = new Map((i.cost_per_action_type ?? []).map((c) => [c.action_type, Number(c.value) || 0]));
    const costPerResult = primary.resultType
      ? costMap.get(primary.resultType.replace("meta:", "").replace("purchase", "omni_purchase")) ?? null
      : null;
    const ad: Ad = {
      id: meta.id,
      accountId: accountId,
      name: meta.name,
      campaignName: null,
      adsetName: meta.adset?.name ?? null,
      adsetId: meta.adset_id ?? null,
      status: meta.status,
      spend,
      impressions: num(i.impressions),
      clicks: num(i.clicks),
      ctr: null,
      cpc: i.cpc ? Number(i.cpc) : null,
      results: primary.count,
      resultType: primary.resultType,
      costPerResult,
      engagement: 0,
      // Prefer the full-resolution creative image over the tiny thumbnail so
      // the report cards render crisp, legible creatives (not upscaled blur).
      thumbnailUrl: meta.creative?.image_url ?? meta.creative?.thumbnail_url ?? null,
      platform: "meta",
      metrics: toMetaMetricsDict(i),
    };
    const cid = i.campaign_id ?? "_unknown";
    if (!adsByCampaign.has(cid)) adsByCampaign.set(cid, []);
    adsByCampaign.get(cid)!.push(ad);
  }

  const outCampaigns: Campaign[] = campaigns.map((c) => {
    const i = insightsByCampaign.get(c.id);
    const spend = num(i?.spend);
    const primary = extractPrimaryAction(i?.actions, focus);
    const costMap = new Map((i?.cost_per_action_type ?? []).map((cc) => [cc.action_type, Number(cc.value) || 0]));
    const costPerResult = primary.resultType
      ? costMap.get(primary.resultType.replace("meta:", "").replace("purchase", "omni_purchase")) ?? null
      : null;
    const myAds = (adsByCampaign.get(c.id) ?? []).map((ad) => ({ ...ad, campaignName: c.name }));
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      spend,
      budget: c.daily_budget ? num(c.daily_budget) / 100 : (c.lifetime_budget ? num(c.lifetime_budget) / 100 : null),
      impressions: num(i?.impressions),
      clicks: num(i?.clicks),
      cpc: i?.cpc ? Number(i.cpc) : null,
      results: primary.count,
      resultType: primary.resultType,
      costPerResult,
      engagement: 0,
      ads: myAds,
      metrics: i ? toMetaMetricsDict(i) : undefined,
    };
  }).filter((c) => (c.spend ?? 0) > 0 || ((c.ads?.length ?? 0) > 0));

  const totalSpend = outCampaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalResults = outCampaigns.reduce((s, c) => s + (c.results ?? 0), 0);
  const totalClicks = outCampaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);

  // Pre-computed breakdowns disabled in Flint — Adglow's pipeline serves
  // breakdowns via live API queries on demand.
  const breakdowns: import("@/lib/reports").AccountSnapshot["breakdowns"] = undefined;

  return {
    accountId,
    accountName: client.name,
    clientSlug: client.slug,
    monthlyBudget: client.monthlyBudget?.meta ?? null,
    mediaPlanUrl: client.mediaPlanUrl ?? null,
    focusMetrics: focus,
    totalSpend,
    spendExcluded: 0,
    totalBudget: client.monthlyBudget?.meta ?? 0,
    totalResults,
    totalClicks,
    totalEngagement: 0,
    campaigns: outCampaigns,
    breakdowns,
  };
}

/**
 * Admin-only: list campaigns for an account with insights at a given date preset.
 */
export interface AdminCampaignRow {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  spend: number;
  /**
   * Contracted budget for the admin window:
   * - lifetime_budget when set (truth: campaign-level CBO with lifetime cap)
   * - else daily_budget × days_in_window
   * - else null (ABO campaign relying on adset-level budgets)
   */
  budget: number | null;
  results: number;
  resultType: string | null;
}

interface MetaCampaignInsightWithName extends MetaInsight {
  campaign_name?: string;
}

function pickPrimaryResult(actions: Array<{ action_type: string; value: string }> | undefined): {
  results: number;
  resultType: string | null;
} {
  const byType = new Map((actions ?? []).map((a) => [a.action_type, Number(a.value) || 0]));
  for (const [keys, rt] of [
    [["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"], "meta:purchase"],
    [["lead", "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead_grouped"], "meta:lead"],
    [["link_click"], "meta:link_click"],
  ] as const) {
    for (const k of keys) {
      const v = byType.get(k);
      if (v && v > 0) return { results: v, resultType: rt };
    }
  }
  return { results: 0, resultType: null };
}

/**
 * Admin-only: list campaigns for an account with insights for a given window.
 * Used by /reports/admin/[client]. Accepts a `datePreset` ("maximum") or a
 * `windowDays` int or a custom `since/until` range.
 */
export async function listMetaCampaignsForAdmin(
  accountId: string,
  token: string,
  options: { datePreset: "maximum" } | { windowDays: number } | { since: string; until: string } = { windowDays: 90 },
): Promise<AdminCampaignRow[]> {
  let daysInWindow: number | null = null;
  const timeP: Record<string, string> = (() => {
    if ("datePreset" in options) return { date_preset: options.datePreset } as Record<string, string>;
    if ("since" in options) {
      const a = new Date(options.since + "T00:00:00Z").getTime();
      const b = new Date(options.until + "T00:00:00Z").getTime();
      daysInWindow = Math.max(1, Math.round((b - a) / 86_400_000) + 1);
      return { time_range: JSON.stringify({ since: options.since, until: options.until }) } as Record<string, string>;
    }
    daysInWindow = options.windowDays;
    const until = new Date();
    const since = new Date(until.getTime() - (options.windowDays - 1) * 86_400_000);
    const ymd = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    return { time_range: JSON.stringify({ since: ymd(since), until: ymd(until) }) } as Record<string, string>;
  })();

  const insights = await fbGetAll<MetaCampaignInsightWithName>(
    `/${accountId}/insights`,
    {
      level: "campaign",
      ...timeP,
      fields: "campaign_id,campaign_name,spend,actions,cost_per_action_type",
      limit: "500",
    },
    token,
  );

  const withSpend = insights.filter((i) => !!i.campaign_id && num(i.spend) > 0);
  const ids = withSpend.map((i) => i.campaign_id!);
  const configs = ids.length > 0
    ? await batchGetByIds<{ id: string; name: string; status: string; effective_status?: string; daily_budget?: string; lifetime_budget?: string }>(
        ids,
        "id,name,status,effective_status,daily_budget,lifetime_budget",
        token,
      )
    : [];
  const configById = new Map(configs.map((c) => [c.id, c]));

  return withSpend.map((i) => {
    const cfg = configById.get(i.campaign_id!);
    const { results, resultType } = pickPrimaryResult(i.actions);
    const budget = cfg?.lifetime_budget
      ? Number(cfg.lifetime_budget) / 100
      : (cfg?.daily_budget && daysInWindow)
        ? (Number(cfg.daily_budget) / 100) * daysInWindow
        : null;
    return {
      id: i.campaign_id!,
      name: cfg?.name ?? i.campaign_name ?? "(sin nombre)",
      status: cfg?.status ?? "UNKNOWN",
      effectiveStatus: cfg?.effective_status ?? cfg?.status ?? "UNKNOWN",
      spend: num(i.spend),
      budget,
      results,
      resultType,
    };
  });
}

/**
 * Fetch a specific list of campaigns by their Meta IDs. Used by the
 * "buscar por ID" admin feature and for augmenting the admin list with
 * markup'd campaigns that fell outside the spend window.
 */
export async function fetchMetaCampaignsByIds(
  campaignIds: string[],
  token: string,
  options: { datePreset: "maximum" } | { windowDays: number } = { windowDays: 90 },
): Promise<AdminCampaignRow[]> {
  if (campaignIds.length === 0) return [];

  let daysInWindow: number | null = null;
  const timeP: Record<string, string> = (() => {
    if ("datePreset" in options) return { date_preset: options.datePreset } as Record<string, string>;
    daysInWindow = options.windowDays;
    const until = new Date();
    const since = new Date(until.getTime() - (options.windowDays - 1) * 86_400_000);
    const ymd = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    return { time_range: JSON.stringify({ since: ymd(since), until: ymd(until) }) } as Record<string, string>;
  })();

  const configs = await batchGetByIds<{ id: string; name: string; status: string; effective_status?: string; daily_budget?: string; lifetime_budget?: string }>(
    campaignIds,
    "id,name,status,effective_status,daily_budget,lifetime_budget",
    token,
  );
  const configById = new Map(configs.map((c) => [c.id, c]));

  const insightsById = new Map<string, MetaInsight>();
  await Promise.all(campaignIds.map(async (id) => {
    try {
      const j = await fbGet<{ data: MetaInsight[] }>(
        `/${id}/insights`,
        { ...timeP, fields: "spend,actions,cost_per_action_type" },
        token,
      );
      if (j?.data?.[0]) insightsById.set(id, j.data[0]);
    } catch { /* skip missing/invalid campaign */ }
  }));

  return campaignIds
    .map((id) => {
      const cfg = configById.get(id);
      if (!cfg) return null;
      const ins = insightsById.get(id);
      const { results, resultType } = pickPrimaryResult(ins?.actions);
      const budget = cfg.lifetime_budget
        ? Number(cfg.lifetime_budget) / 100
        : (cfg.daily_budget && daysInWindow)
          ? (Number(cfg.daily_budget) / 100) * daysInWindow
          : null;
      return {
        id,
        name: cfg.name,
        status: cfg.status,
        effectiveStatus: cfg.effective_status ?? cfg.status,
        spend: num(ins?.spend),
        budget,
        results,
        resultType,
      } as AdminCampaignRow;
    })
    .filter((x): x is AdminCampaignRow => x != null);
}

/**
 * Fuzzy search campaigns in an account by name substring. Pulls the full
 * campaign list (no insights — fast) and filters case-insensitively. Top 50.
 */
export async function searchMetaCampaignsByName(
  accountId: string,
  token: string,
  query: string,
): Promise<Array<{ id: string; name: string; effectiveStatus: string }>> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const campaigns = await fbGetAll<{ id: string; name: string; status: string; effective_status?: string }>(
    `/${accountId}/campaigns`,
    { fields: "id,name,status,effective_status", limit: "500" },
    token,
  );
  return campaigns
    .filter((c) => c.name.toLowerCase().includes(q) || c.id.includes(q))
    .slice(0, 50)
    .map((c) => ({ id: c.id, name: c.name, effectiveStatus: c.effective_status ?? c.status }));
}

async function ingestWithRetry(
  client: ReportClient,
  token: string,
  timeRange?: MetaTimeRange,
): Promise<AccountSnapshot> {
  try {
    return await ingestMetaAccount(client, token, timeRange);
  } catch (err) {
    const msg = String(err);
    const isRateLimit = /too many calls|rate limit|80004|4\b|\b17\b/i.test(msg);
    if (!isRateLimit) throw err;
    console.log(`[meta/${client.slug}] rate-limited, waiting 60s and retrying once…`);
    await new Promise((r) => setTimeout(r, 60_000));
    return await ingestMetaAccount(client, token, timeRange);
  }
}

/**
 * Ingest one client's Meta account for a specific time range. Used by the
 * per-range report path (no DB write) — caller is responsible for caching.
 */
export async function ingestMetaAccountForRange(
  client: ReportClient,
  token: string,
  timeRange: MetaTimeRange,
): Promise<AccountSnapshot> {
  return ingestWithRetry(client, token, timeRange);
}

export async function ingestAllMeta(): Promise<{
  accounts: AccountSnapshot[];
  errors: Array<{ clientSlug: string; error: string }>;
}> {
  const clients = await getAllClients();
  const withMeta = clients.filter((c) => c.metaAccountId);

  const accounts: AccountSnapshot[] = [];
  const errors: Array<{ clientSlug: string; error: string }> = [];

  for (const c of withMeta) {
    const token = getMetaTokenForClient(c);
    if (!token) {
      errors.push({ clientSlug: c.slug, error: `No Meta token configured (expected env ${c.metaTokenEnv ?? `META_TOKEN_${c.code}`})` });
      continue;
    }
    try {
      const result = await ingestWithRetry(c, token);
      accounts.push(result);
    } catch (err) {
      errors.push({ clientSlug: c.slug, error: String(err).slice(0, 300) });
    }
  }

  return { accounts, errors };
}
