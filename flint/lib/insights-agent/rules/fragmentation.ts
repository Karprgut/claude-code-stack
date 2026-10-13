import type { Rule } from "./types";

/**
 * Budget fragmentation: spend is spread across many entities with low
 * per-entity volume. Leads to unstable learning and inefficient
 * auction participation.
 *
 * Heuristic: if more than 60% of campaigns have < 5% of total spend AND
 * their per-campaign conversion count is below the learning threshold.
 *
 * The learning-threshold check only matters for conversion-stage
 * campaigns (purchase, lead). Awareness campaigns don't need 25+
 * "conversions" to stabilise — their volume is impressions/views.
 */
export const fragmentationRule: Rule = {
  id: "fragmentation",
  name: "Budget fragmentation",
  run: ({ rows }) => {
    // Group by campaign_id (this rule operates at campaign granularity)
    const byCampaign = new Map<string, typeof rows[number]>();
    for (const r of rows) {
      const existing = byCampaign.get(r.campaign_id);
      if (!existing) { byCampaign.set(r.campaign_id, { ...r }); continue; }
      existing.spend += r.spend;
      existing.impressions += r.impressions;
      existing.clicks += r.clicks;
      if (r.conversions != null) existing.conversions = (existing.conversions ?? 0) + r.conversions;
    }
    const campaigns = Array.from(byCampaign.values());
    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    if (campaigns.length < 4 || totalSpend <= 0) return [];

    const LEARNING_CONV_THRESHOLD = 25;     // Meta says ~50/week; we flag thin over 30d
    const SMALL_SHARE = 0.05;

    const small = campaigns.filter((c) => c.spend / totalSpend < SMALL_SHARE);
    // Only flag learning-thin on conversion-stage campaigns.
    const smallUnderLearning = small.filter((c) =>
      c.funnel_stage === "conversion" && (c.conversions ?? 0) < LEARNING_CONV_THRESHOLD
    );

    const smallPct = small.length / campaigns.length;
    if (smallPct < 0.6) return [];     // need a majority to be small

    const affectedSpend = small.reduce((s, c) => s + c.spend, 0);
    const sharePct = (affectedSpend / totalSpend) * 100;

    return [{
      insight: {
        title: `Presupuesto fragmentado en ${small.length} campañas chicas`,
        entity_level: "account",
        entity_name: "cuenta",
        timeframe: "",  // filled in by engine
        observation: `${small.length} de ${campaigns.length} campañas reciben menos de 5% del presupuesto total. Entre ellas suman ${sharePct.toFixed(1)}% del spend (${affectedSpend.toFixed(0)}).`,
        evidence: {
          metrics: [
            { name: "campañas con <5% share", value: small.length },
            { name: "spend en campañas chicas (share)", value: sharePct, unit: "%" },
            { name: "campañas bajo umbral de aprendizaje", value: smallUnderLearning.length },
          ],
          comparisons: [
            { dimension: "% campañas chicas", delta: smallPct, deltaPct: smallPct * 100 },
          ],
          thresholds_triggered: ["fragmentation.small_majority", ...(smallUnderLearning.length > 0 ? ["fragmentation.learning_thin"] : [])],
        },
        diagnosis: "Presupuestos tan chicos dificultan que el algoritmo salga de la fase de aprendizaje. Cada campaña compite por su propia ventana y ninguna obtiene suficientes señales para optimizar. Además se duplica overhead (copies, audiencias, reporting).",
        business_impact: `Potencial mejora de eficiencia consolidando hasta ${sharePct.toFixed(0)}% del spend actualmente disperso.`,
        confidence: smallPct > 0.75 ? "high" : "medium",
      },
      recommendations: [
        {
          category: "structure",
          action: `Consolidar las ${small.length} campañas de bajo volumen en un máximo de 2–3 campañas agrupadas por objetivo, manteniendo diversidad creativa vía ad sets en vez de campañas separadas.`,
          rationale: "Menos campañas = más señales por campaña = optimización más rápida y CPA más estable. La diversidad creativa se preserva a nivel ad set/ad.",
          expected_impact: "CPA −5% a −15% en 14 días post-consolidación + reducción de overhead operativo.",
          urgency: "medium",
          effort: "medium",
          confidence: "medium",
          risks: ["Pérdida temporal de señales durante la transición (primera semana)", "Si las campañas chicas atacan audiencias genuinamente distintas, no todas deben consolidarse"],
          dependencies: ["Media planner aprueba la consolidación", "Naming convention permite identificar objetivos agrupables"],
          suggested_test: "Antes de consolidar todo, hacer lift test con las 3–5 campañas con CPA más alto: pausar durante 2 semanas y medir si el CPA agregado mejora.",
        },
        ...(smallUnderLearning.length > 0 ? [{
          category: "budget" as const,
          action: `Pausar las ${smallUnderLearning.length} campañas con menos de ${LEARNING_CONV_THRESHOLD} conversiones en la ventana y reasignar su presupuesto a la campaña con mejor CPA.`,
          rationale: "Volumen insuficiente para aprendizaje estable; el spend ahí no compra optimización, compra datos ruidosos.",
          expected_impact: "Ahorro inmediato + mejora marginal de CPA en la(s) campaña(s) receptora(s).",
          urgency: "high" as const,
          effort: "low" as const,
          confidence: "high" as const,
          risks: ["Si son campañas que apenas arrancan, necesitan más tiempo antes de evaluar"],
          dependencies: [],
        }] : []),
      ],
    }];
  },
};
