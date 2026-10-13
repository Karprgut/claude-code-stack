/**
 * Adapter from reports' `AccountSnapshot` → canonical rows the insights
 * engine understands. `AccountSnapshot` has the same shape across all
 * platforms (Meta, Google Ads, TikTok) after the reports-ingest layer
 * normalises them, so a single adapter parameterised by `platform`
 * covers them all.
 */

import type { CanonicalRow } from "../config/canonical-schema";
import { classifyFunnelStage } from "../config/funnel-stages";
import type { AccountSnapshot } from "../../reports";

/**
 * One canonical row per ad (finest granularity) when ads are available,
 * otherwise one per campaign. Mixed granularity is acceptable — rules
 * aggregate back up where needed.
 */
export function fromAccountSnapshot(
  account: AccountSnapshot,
  platform: string,
): CanonicalRow[] {
  const rows: CanonicalRow[] = [];
  for (const c of account.campaigns ?? []) {
    const campaignId = c.id ?? c.name;
    const campaignStage = classifyFunnelStage(c.resultType);
    const campaignRow: CanonicalRow = {
      platform,
      campaign_id: campaignId,
      campaign_name: c.name,
      objective: c.resultType ?? undefined,
      status: c.status,
      spend: c.spend ?? 0,
      impressions: c.impressions ?? 0,
      clicks: c.clicks ?? 0,
      conversions: c.results ?? 0,
      conversion_type: c.resultType ?? undefined,
      funnel_stage: campaignStage,
    };
    if (!c.ads || c.ads.length === 0) {
      rows.push(campaignRow);
      continue;
    }
    // If ads are present, emit per-ad rows so rules can reason at ad level.
    for (const ad of c.ads) {
      const adConvType = ad.resultType ?? c.resultType ?? undefined;
      rows.push({
        platform,
        campaign_id: campaignId,
        campaign_name: c.name,
        ad_id: ad.id,
        ad_name: ad.name,
        adset_id: ad.adsetName ?? undefined,   // AccountSnapshot doesnt carry adset ids today
        adset_name: ad.adsetName ?? undefined,
        objective: adConvType,
        status: ad.status,
        spend: ad.spend,
        impressions: ad.impressions,
        clicks: ad.clicks,
        conversions: ad.results,
        conversion_type: adConvType,
        funnel_stage: classifyFunnelStage(adConvType),
      });
    }
  }
  return rows;
}

/** @deprecated use `fromAccountSnapshot(account, "meta")` */
export function fromMetaAccountSnapshot(account: AccountSnapshot): CanonicalRow[] {
  return fromAccountSnapshot(account, "meta");
}
