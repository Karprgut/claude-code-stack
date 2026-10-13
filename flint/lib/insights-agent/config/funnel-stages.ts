/**
 * Funnel-stage classification for result/conversion types.
 *
 * Different campaign objectives produce conversions that are NOT
 * comparable 1:1. A link_click campaign and a purchase campaign both
 * report "results", but those results have very different business
 * value. Without this classifier, rules that compare volume or
 * cost-per-result treat high-volume top-of-funnel campaigns (awareness,
 * consideration) as "more efficient" than bottom-of-funnel performance
 * campaigns — which is exactly backwards.
 *
 * Every rule that compares entities by `conversions` or `cpa` must
 * first segment by `funnel_stage` and only compare within the same
 * stage.
 */

export type FunnelStage = "awareness" | "consideration" | "conversion" | "unknown";

/** Higher = deeper in the funnel = more valuable per result. */
export const FUNNEL_STAGE_RANK: Record<FunnelStage, number> = {
  awareness: 1,
  consideration: 2,
  conversion: 3,
  unknown: 0,
};

export const FUNNEL_STAGE_LABEL_ES: Record<FunnelStage, string> = {
  awareness: "Awareness (TOFU)",
  consideration: "Consideración (MOFU)",
  conversion: "Conversión (BOFU)",
  unknown: "Sin clasificar",
};

/**
 * Map a raw result/conversion type string (from Meta, Google, TikTok)
 * to a funnel stage. Tolerates the `meta:` prefix, case variations
 * and action-slug formats like `offsite_conversion.fb_pixel_purchase`.
 *
 * When in doubt — default to `unknown` rather than assuming a stage.
 * Rules should not compare `unknown` entities across objectives.
 */
export function classifyFunnelStage(conversionType: string | null | undefined): FunnelStage {
  if (!conversionType) return "unknown";
  const raw = conversionType.toLowerCase().trim();
  const clean = raw.replace(/^meta:/, "").replace(/^actions:/, "").replace(/^offsite_conversion\./, "");

  // ── Bottom of funnel — direct revenue / qualified leads ──────────────
  const BOFU = [
    "purchase", "omni_purchase", "fb_pixel_purchase",
    "lead", "leadgen", "leadgen_other", "leadgen_grouped", "fb_pixel_lead",
    "complete_registration", "fb_pixel_complete_registration",
    "initiate_checkout", "fb_pixel_initiate_checkout",
    "add_to_cart", "fb_pixel_add_to_cart",
    "subscribe", "submit_application",
    "messaging_conversation_started_7d",
    "onsite_conversion_messaging_conversation_started_7d",
    "conversion",  // generic conversion signal from Google Ads
  ];
  if (BOFU.some((k) => clean.includes(k))) return "conversion";

  // ── Middle of funnel — indicates real interest, not just reach ───────
  const MOFU = [
    "link_click",
    "landing_page_view",
    "video_view",
    "view_content", "fb_pixel_view_content",
    "page_engagement", "post_engagement",
    "product_catalog_sales",  // Advantage+ shopping variants
  ];
  if (MOFU.some((k) => clean.includes(k))) return "consideration";

  // ── Top of funnel — pure delivery metrics ───────────────────────────
  const TOFU = ["reach", "impressions", "brand_awareness", "thruplay"];
  if (TOFU.some((k) => clean.includes(k))) return "awareness";

  return "unknown";
}

/**
 * Human label used in prompts and UI.
 */
export function humanLabel(type: string | null | undefined): string {
  if (!type) return "—";
  const clean = type.replace(/^meta:/i, "").replace(/^actions:/i, "").replace(/_/g, " ");
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}
