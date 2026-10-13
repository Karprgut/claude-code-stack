/**
 * Canonical schema — maps platform-specific column names to a
 * standard set of fields the agent reasons about. Add platforms by
 * extending the PLATFORM_MAPS record.
 */

export type CanonicalField =
  // identity
  | "campaign_id" | "campaign_name" | "adset_id" | "adset_name"
  | "ad_id" | "ad_name"
  | "platform" | "objective" | "status" | "date_start" | "date_stop"
  // spend + delivery
  | "spend" | "impressions" | "reach" | "frequency" | "clicks"
  | "link_clicks" | "ctr" | "cpc" | "cpm"
  // conversion
  | "conversions" | "conversion_type" | "cvr" | "cpa"
  // revenue (when available)
  | "revenue" | "roas";

/**
 * One row of campaign performance data after normalization.
 * Not every field is required — the agent degrades gracefully.
 */
export interface CanonicalRow {
  // identity
  platform: string;
  campaign_id: string;
  campaign_name: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  objective?: string;
  status?: string;
  date_start?: string;
  date_stop?: string;
  // delivery
  spend: number;
  impressions: number;
  reach?: number;
  frequency?: number;
  clicks: number;
  link_clicks?: number;
  // conversion
  conversions?: number;
  conversion_type?: string;
  /**
   * Funnel stage derived from conversion_type/objective. Populated by
   * normalize.ts. Rules MUST NOT compare conversions or CPA across
   * different funnel_stage values — a link-click campaign is not
   * comparable to a purchase campaign.
   */
  funnel_stage?: "awareness" | "consideration" | "conversion" | "unknown";
  revenue?: number;
  // derived — filled in by engine/metrics.ts if absent
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cvr?: number;
  cpa?: number;
  roas?: number;
}

/**
 * Platform column → canonical field. If a platform isnt listed we
 * still try a fuzzy match on the canonical name.
 */
export const PLATFORM_MAPS: Record<string, Partial<Record<string, CanonicalField>>> = {
  meta: {
    campaign_id: "campaign_id",
    campaign_name: "campaign_name",
    adset_id: "adset_id",
    adset_name: "adset_name",
    ad_id: "ad_id",
    ad_name: "ad_name",
    objective: "objective",
    effective_status: "status",
    spend: "spend",
    impressions: "impressions",
    reach: "reach",
    frequency: "frequency",
    clicks: "clicks",
    inline_link_clicks: "link_clicks",
    ctr: "ctr",
    cpc: "cpc",
    cpm: "cpm",
    // actions.value[purchase/lead/link_click] → conversions (handled by normalize.ts)
    action_value: "revenue",
  },
  google_ads: {
    campaign_id: "campaign_id",
    campaign_name: "campaign_name",
    ad_group_id: "adset_id",
    ad_group_name: "adset_name",
    ad_id: "ad_id",
    cost_micros: "spend",                     // divide by 1e6
    impressions: "impressions",
    clicks: "clicks",
    ctr: "ctr",
    average_cpc: "cpc",
    average_cpm: "cpm",
    conversions: "conversions",
    conversions_value: "revenue",
  },
  tiktok: {
    campaign_id: "campaign_id",
    campaign_name: "campaign_name",
    adgroup_id: "adset_id",
    adgroup_name: "adset_name",
    ad_id: "ad_id",
    ad_name: "ad_name",
    spend: "spend",
    impressions: "impressions",
    clicks: "clicks",
    ctr: "ctr",
    cpc: "cpc",
    cpm: "cpm",
    reach: "reach",
    frequency: "frequency",
    conversion: "conversions",
    cost_per_conversion: "cpa",
  },
};

/** A user-supplied dictionary overrides the platform map. */
export type ColumnDictionary = Record<string, CanonicalField>;
