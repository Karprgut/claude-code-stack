import type { Rule } from "./types";
import { FUNNEL_STAGE_LABEL_ES, type FunnelStage } from "../config/funnel-stages";

/**
 * Winner concentration: a handful of creatives / campaigns drive most
 * of the results. Signal to consolidate delivery into winners and
 * study them to replicate across the account.
 *
 * Heuristic: top 20% of entities (by results) produce > 60% of total
 * results — this is a Pareto-heavier-than-expected distribution.
 *
 * IMPORTANT: only compares entities within the SAME funnel stage.
 * Mixing a link-click campaign (10k results) with a purchase campaign
 * (50 results) would crown the click campaign as the "winner" and
 * recommend shifting budget away from the purchase campaign — exactly
 * the wrong conclusion. So we run the rule independently per stage
 * and emit one insight per stage where the pattern fires.
 */
export const concentrationRule: Rule = {
  id: "concentration",
  name: "Winner concentration",
  run: ({ rows }) => {
    // Group rows by funnel stage first — never compare across stages.
    const byStage = new Map<FunnelStage, typeof rows>();
    for (const r of rows) {
      const stage = (r.funnel_stage ?? "unknown") as FunnelStage;
      const bucket = byStage.get(stage) ?? [];
      bucket.push(r);
      byStage.set(stage, bucket);
    }

    const outputs: ReturnType<Rule["run"]> = [];

    for (const [stage, stageRows] of byStage) {
      // Skip unknown stage — we don't know what "winning" means there.
      if (stage === "unknown") continue;

      // Aggregate to ad-level when ad_id is present, else campaign-level.
      const byEntity = new Map<string, { id: string; name: string; level: "ad" | "campaign"; spend: number; conversions: number; objective?: string }>();
      for (const r of stageRows) {
        const hasAd = !!r.ad_id;
        const key = hasAd ? `ad:${r.ad_id}` : `c:${r.campaign_id}`;
        const name = hasAd ? (r.ad_name ?? r.ad_id!) : r.campaign_name;
        const prev = byEntity.get(key);
        if (prev) {
          prev.spend += r.spend;
          prev.conversions += r.conversions ?? 0;
        } else {
          byEntity.set(key, {
            id: key,
            name,
            level: hasAd ? "ad" : "campaign",
            spend: r.spend,
            conversions: r.conversions ?? 0,
            objective: r.conversion_type,
          });
        }
      }
      const withResults = Array.from(byEntity.values()).filter((e) => e.conversions > 0);
      if (withResults.length < 5) continue;

      const total = withResults.reduce((s, e) => s + e.conversions, 0);
      if (total === 0) continue;

      const sorted = [...withResults].sort((a, b) => b.conversions - a.conversions);
      const top20pct = Math.max(1, Math.ceil(sorted.length * 0.2));
      const topWinners = sorted.slice(0, top20pct);
      const winnersResults = topWinners.reduce((s, e) => s + e.conversions, 0);
      const winnersShare = winnersResults / total;

      if (winnersShare < 0.6) continue;

      const winnerSpend = topWinners.reduce((s, e) => s + e.spend, 0);
      const totalSpend = withResults.reduce((s, e) => s + e.spend, 0);
      const winnerSpendShare = totalSpend > 0 ? winnerSpend / totalSpend : 0;
      const entityNoun = topWinners[0].level === "ad" ? "anuncios" : "campañas";
      const stageLabel = FUNNEL_STAGE_LABEL_ES[stage];

      outputs.push({
        insight: {
          title: `${top20pct} ${entityNoun} concentran ${(winnersShare * 100).toFixed(0)}% de los resultados (${stageLabel})`,
          entity_level: "account",
          entity_name: "cuenta",
          affected_entities: topWinners.map((w) => w.name),
          timeframe: "",
          observation: `En campañas de ${stageLabel.toLowerCase()}, el top 20% (${top20pct} de ${sorted.length}) produce ${winnersResults} de ${total} resultados (${(winnersShare * 100).toFixed(1)}%). Estos ${entityNoun} reciben ${(winnerSpendShare * 100).toFixed(1)}% del spend de esta etapa — hay margen para concentrar más.`,
          evidence: {
            metrics: [
              { name: "# winners (top 20%)", value: top20pct },
              { name: "% de resultados en winners", value: winnersShare * 100, unit: "%" },
              { name: "% de spend en winners", value: winnerSpendShare * 100, unit: "%" },
              { name: "etapa de embudo", value: 0, unit: stageLabel },
            ],
            comparisons: [
              { dimension: "concentración de resultados vs spend", delta: winnersShare - winnerSpendShare, deltaPct: (winnersShare - winnerSpendShare) * 100 },
            ],
            thresholds_triggered: [`concentration.pareto_60_20.${stage}`],
          },
          diagnosis: `Cuando pocos ${entityNoun} concentran los resultados y reciben proporcionalmente menos spend, hay una brecha entre dónde entrega la plataforma y dónde rinde la data. Consolidar delivery en winners típicamente baja el costo por ${stage === "conversion" ? "conversión" : "resultado"}.`,
          business_impact: `Si el top ${top20pct} recibiera el 50% del spend de ${stageLabel.toLowerCase()} (hoy ${(winnerSpendShare * 100).toFixed(0)}%), manteniendo eficiencia relativa, se esperaría ${Math.round(winnersResults * (0.5 / Math.max(winnerSpendShare, 0.01)))}+ resultados/mes (vs ${winnersResults} actuales).`,
          confidence: "high",
        },
        recommendations: [
          {
            category: "budget",
            action: `Aumentar en 30–50% el presupuesto de los ${top20pct} ${entityNoun} top de ${stageLabel.toLowerCase()} (${topWinners.slice(0, 3).map((t) => t.name).join(", ")}${topWinners.length > 3 ? ", etc." : ""}) durante 14 días. Monitorear costo por resultado para confirmar que la eficiencia no se degrada.`,
            rationale: `La data ya validó qué funciona dentro de ${stageLabel.toLowerCase()}; el siguiente paso es dar más oxígeno antes de saturar.`,
            expected_impact: "Volumen de resultados de esta etapa +20–40%. Riesgo: el costo por resultado puede subir 5–10% si se llega a saturación.",
            urgency: "medium",
            effort: "low",
            confidence: "high",
            risks: ["Fatiga acelerada si el creativo es el mismo", "Saturación de audiencia"],
            dependencies: ["Presupuesto disponible para reasignar"],
            suggested_test: "Duplicar los winners en una segunda campaña con presupuesto propio (no competir con la original) para medir si escalan linealmente.",
          },
          {
            category: "creative",
            action: `Analizar los elementos comunes de los ${top20pct} ${entityNoun} ganadores de ${stageLabel.toLowerCase()} (formato, hook, CTA, público) y producir 2–3 nuevas variantes.`,
            rationale: "El conocimiento que los winners generan debe propagarse antes de que se agoten por fatiga.",
            expected_impact: "Nuevos creativos de alta probabilidad de éxito dentro de la misma etapa del embudo.",
            urgency: "medium",
            effort: "high",
            confidence: "medium",
            risks: ["Los elementos ganadores pueden no replicarse si el contexto cambia"],
            dependencies: ["Equipo creativo disponible"],
          },
        ],
      });
    }

    return outputs;
  },
};
