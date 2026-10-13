/**
 * Main entry point. analyze() takes campaign data + context and returns
 * a full InsightsOutput. Pure except for the optional Claude call in
 * synthesize(); you can disable LLM via DISABLE_INSIGHTS_LLM=1.
 */

import type { CanonicalRow } from "../config/canonical-schema";
import type { InsightsOutput } from "../schema";
import { enrichRows, computeBenchmarks } from "./metrics";
import { diagnose } from "./diagnose";
import { prioritize } from "./prioritize";
import { insightScore } from "./scoring";
import { synthesize } from "./synthesize";

export interface AnalyzeContext {
  accountId: string;
  accountName: string;
  clientSlug?: string;
  platform: string;             // "meta" | "google" | "tiktok" | ...
  timeframe: { since: string; until: string };
}

export async function analyze(
  rawRows: CanonicalRow[],
  context: AnalyzeContext,
): Promise<InsightsOutput> {
  const dataQualityFlags = validateRows(rawRows);
  const rows = enrichRows(rawRows);
  const benchmarks = computeBenchmarks(rows);

  const timeframeLabel = `${context.timeframe.since} → ${context.timeframe.until}`;

  const { insights: rawInsights, recommendations } = diagnose({
    rows,
    benchmarks,
    timeframe: context.timeframe,
    timeframeLabel,
  });

  // Sort insights by score descending so the summary focuses on biggest
  const insights = [...rawInsights].sort((a, b) => insightScore(b) - insightScore(a));

  const meta: InsightsOutput["meta"] = {
    accountId: context.accountId,
    accountName: context.accountName,
    clientSlug: context.clientSlug,
    timeframe: context.timeframe,
    platform: context.platform,
    generatedAt: new Date().toISOString(),
    dataPoints: {
      campaigns: new Set(rows.map((r) => r.campaign_id)).size,
      adsets: new Set(rows.map((r) => r.adset_id).filter(Boolean)).size || undefined,
      ads: new Set(rows.map((r) => r.ad_id).filter(Boolean)).size || undefined,
    },
  };

  const prioritization = prioritize(recommendations);

  const summary = process.env.DISABLE_INSIGHTS_LLM === "1"
    ? ruleOnlySummary(insights, recommendations)
    : await synthesize({ meta, insights, recommendations });

  const limitations = computeLimitations(rows, rawRows);

  return {
    meta,
    summary,
    insights,
    recommendations,
    prioritization,
    data_quality_flags: dataQualityFlags,
    limitations,
  };
}

function validateRows(rows: CanonicalRow[]): InsightsOutput["data_quality_flags"] {
  const flags: InsightsOutput["data_quality_flags"] = [];
  const impossibleCTR: string[] = [];
  const spendNoClicks: string[] = [];
  const convNoSpend: string[] = [];

  for (const r of rows) {
    if (r.impressions > 0 && r.clicks > r.impressions) {
      impossibleCTR.push(r.campaign_id);
    }
    if (r.spend > 100 && r.clicks === 0) {
      spendNoClicks.push(r.campaign_id);
    }
    if ((r.conversions ?? 0) > 0 && r.spend === 0) {
      convNoSpend.push(r.campaign_id);
    }
  }

  if (impossibleCTR.length > 0) {
    flags.push({ severity: "error", message: `${impossibleCTR.length} filas con más clicks que impresiones (CTR imposible).`, affectedEntities: impossibleCTR });
  }
  if (spendNoClicks.length > 0) {
    flags.push({ severity: "warn", message: `${spendNoClicks.length} campañas con gasto > 100 pero 0 clicks. Posible tracking/filtro.`, affectedEntities: spendNoClicks });
  }
  if (convNoSpend.length > 0) {
    flags.push({ severity: "warn", message: `${convNoSpend.length} campañas con conversiones pero sin spend registrado.`, affectedEntities: convNoSpend });
  }
  return flags;
}

function computeLimitations(enriched: CanonicalRow[], raw: CanonicalRow[]): string[] {
  const limits: string[] = [];
  const hasRevenue = enriched.some((r) => r.revenue != null && r.revenue > 0);
  const hasReach = enriched.some((r) => r.reach != null && r.reach > 0);
  if (!hasRevenue) limits.push("No hay revenue/valor — ROAS y análisis de rentabilidad absoluta no disponibles.");
  if (!hasReach) limits.push("No hay reach — no podemos calcular frecuencia ni detectar fatiga por exposición.");
  if (raw.length < 5) limits.push("Dataset muy chico (<5 filas); las comparaciones contra la mediana son poco estables.");
  return limits;
}

function ruleOnlySummary(insights: InsightsOutput["insights"], recommendations: InsightsOutput["recommendations"]): InsightsOutput["summary"] {
  if (insights.length === 0) {
    return {
      account_health: "No se detectaron patrones problemáticos con las reglas actuales.",
      primary_findings: [],
      main_risks: [],
      main_opportunities: [],
    };
  }
  return {
    account_health: `${insights.length} hallazgos; ${recommendations.filter((r) => r.urgency === "high").length} acciones urgentes.`,
    primary_findings: insights.slice(0, 5).map((i) => i.title),
    main_risks: insights.filter((i) => i.confidence === "high").slice(0, 3).map((i) => i.business_impact),
    main_opportunities: recommendations.filter((r) => r.urgency === "high" && r.effort === "low").slice(0, 3).map((r) => r.action),
  };
}

export type { InsightsOutput } from "../schema";
