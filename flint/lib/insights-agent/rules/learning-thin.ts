import type { Rule } from "./types";

/**
 * Learning thin: too few conversion events for Meta/Google's algorithm
 * to escape "learning phase" and deliver consistent CPA.
 *
 * Heuristic: entity has spend but < 50 conversions over the window.
 * We flag at account level when > 40% of campaigns are in this state.
 *
 * Scoped to conversion-stage campaigns only. An awareness campaign
 * optimising for reach has no "50 conversions" bar to clear — its
 * volume signal is impressions, and Meta's learning-phase mechanics
 * are different. Applying this rule account-wide would false-positive
 * any client running mostly TOFU.
 */
export const learningThinRule: Rule = {
  id: "learning_thin",
  name: "Insufficient learning signal",
  run: ({ rows }) => {
    // Only consider conversion-stage rows for learning-thin.
    const convRows = rows.filter((r) => r.funnel_stage === "conversion");
    if (convRows.length === 0) return [];

    const byCampaign = new Map<string, typeof rows[number]>();
    for (const r of convRows) {
      const existing = byCampaign.get(r.campaign_id);
      if (!existing) { byCampaign.set(r.campaign_id, { ...r }); continue; }
      existing.spend += r.spend;
      existing.conversions = (existing.conversions ?? 0) + (r.conversions ?? 0);
    }
    const campaigns = Array.from(byCampaign.values());
    const active = campaigns.filter((c) => c.spend > 0);
    if (active.length < 3) return [];

    const LEARNING_THRESHOLD = 50;
    const thin = active.filter((c) => (c.conversions ?? 0) < LEARNING_THRESHOLD);
    if (thin.length / active.length < 0.4) return [];

    const wastedSpend = thin.reduce((s, c) => s + c.spend, 0);
    const totalSpend = active.reduce((s, c) => s + c.spend, 0);

    return [{
      insight: {
        title: `${thin.length} campañas por debajo del umbral de aprendizaje`,
        entity_level: "account",
        entity_name: "cuenta",
        timeframe: "",
        observation: `${thin.length} de ${active.length} campañas activas tienen menos de ${LEARNING_THRESHOLD} conversiones en la ventana (recomendado por Meta para salir de learning). Suman ${wastedSpend.toFixed(0)} MXN (${((wastedSpend / totalSpend) * 100).toFixed(1)}% del spend).`,
        evidence: {
          metrics: [
            { name: "campañas en learning thin", value: thin.length },
            { name: "campañas activas", value: active.length },
            { name: "spend atrapado", value: wastedSpend, unit: "MXN" },
          ],
          comparisons: [],
          thresholds_triggered: [`learning_thin.below_${LEARNING_THRESHOLD}`],
        },
        diagnosis: "El algoritmo necesita señales consistentes para optimizar. Con menos de 50 conversiones/semana el modelo entrena con ruido; los CPA reportados no son confiables y las decisiones basadas en ellos son prematuras.",
        business_impact: "Decisiones tomadas hoy con esta data pueden ser equivocadas. Además el delivery es más caro en learning (hasta +30% CPM vs. optimizado).",
        confidence: "high",
      },
      recommendations: [
        {
          category: "structure",
          action: `Consolidar las ${thin.length} campañas en learning con una estrategia de menos campañas pero más presupuesto por campaña. Meta: cada campaña supere ${LEARNING_THRESHOLD} conversiones/semana.`,
          rationale: "Concentrar señales en menos entidades para salir de learning más rápido.",
          expected_impact: "CPM −10 a −20% una vez fuera de learning; CPA más estable y predecible.",
          urgency: "high",
          effort: "medium",
          confidence: "high",
          risks: ["La consolidación temporal rompe aprendizajes previos (ventana de 1–2 semanas de reajuste)"],
          dependencies: [],
          suggested_test: "Consolidar UNA campaña chica en otra y medir si la receptora mantiene CPA + el agregado conversiones sube.",
        },
        {
          category: "bidding",
          action: "Donde sea posible, cambiar de Cost Cap / Bid Cap a Highest Volume (más permisivo) hasta salir de learning, luego volver a la estrategia más agresiva.",
          rationale: "Highest Volume entrega más rápido y ayuda a acumular conversiones para entrenar el modelo.",
          expected_impact: "Más volumen inicial, mejor aprendizaje, posterior optimización más efectiva.",
          urgency: "medium",
          effort: "low",
          confidence: "medium",
          risks: ["CPA inicial puede ser mayor que con Cost Cap"],
          dependencies: [],
        },
      ],
    }];
  },
};
