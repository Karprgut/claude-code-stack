import type { Rule } from "./types";

/**
 * Post-click leak: high CTR (people click) but low CVR (they don't convert).
 * Suggests the problem is AFTER the click — landing page, funnel, offer,
 * or audience/ad mismatch at intent level.
 *
 * Heuristic: CTR above median + MAD, CVR below median - MAD.
 *
 * Emits EXACTLY ONE insight even when many entities match, with the list
 * of affected campaigns exposed as `affected_entities` for pill rendering.
 */
export const postClickLeakRule: Rule = {
  id: "post_click_leak",
  name: "Post-click leak",
  run: ({ rows, benchmarks }) => {
    const ctrBm = benchmarks.ctr;
    const cvrBm = benchmarks.cvr;
    if (!ctrBm || !cvrBm || ctrBm.sampleSize < 3 || cvrBm.sampleSize < 3) return [];

    // Post-click-leak is a conversion-funnel diagnosis — only meaningful
    // for conversion-stage campaigns. A link-click campaign by definition
    // has high CTR and the "conversion" IS the click, so CVR is either
    // 100% or meaningless — this rule would false-positive on TOFU.
    const convRows = rows.filter((r) => r.funnel_stage === "conversion");
    if (convRows.length === 0) return [];

    // Aggregate by campaign — rows may be ad-level so we'd double-count.
    const byCampaign = new Map<string, {
      campaign_id: string;
      campaign_name: string;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }>();
    for (const r of convRows) {
      const key = r.campaign_id;
      const prev = byCampaign.get(key);
      if (!prev) {
        byCampaign.set(key, {
          campaign_id: key,
          campaign_name: r.campaign_name,
          spend: r.spend,
          impressions: r.impressions,
          clicks: r.clicks,
          conversions: r.conversions ?? 0,
        });
      } else {
        prev.spend += r.spend;
        prev.impressions += r.impressions;
        prev.clicks += r.clicks;
        prev.conversions += r.conversions ?? 0;
      }
    }

    const campaigns = Array.from(byCampaign.values())
      .map((c) => ({
        ...c,
        ctr: c.impressions > 0 ? c.clicks / c.impressions : null,
        cvr: c.clicks > 0 ? c.conversions / c.clicks : null,
      }))
      .filter((c) => c.ctr != null && c.cvr != null && c.spend > 0);

    const affected = campaigns.filter((c) => c.ctr! > ctrBm.high && c.cvr! < cvrBm.low);
    if (affected.length === 0) return [];

    const top = [...affected].sort((a, b) => b.spend - a.spend);
    const totalAffectedSpend = affected.reduce((s, c) => s + c.spend, 0);

    // Weighted averages for headline numbers
    const totalImpressions = affected.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = affected.reduce((s, c) => s + c.clicks, 0);
    const totalConversions = affected.reduce((s, c) => s + c.conversions, 0);
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgCvr = totalClicks > 0 ? totalConversions / totalClicks : 0;

    const title = affected.length === 1
      ? `Click alto pero conversión baja: ${top[0].campaign_name}`
      : `Click alto pero conversión baja en ${affected.length} campañas`;
    const entityName = affected.length === 1 ? top[0].campaign_name : `${affected.length} campañas`;

    return [{
      insight: {
        title,
        entity_level: affected.length === 1 ? "campaign" as const : "account" as const,
        entity_name: entityName,
        entity_id: affected.length === 1 ? top[0].campaign_id : undefined,
        affected_entities: top.map((c) => c.campaign_name),
        timeframe: "",
        observation: `CTR promedio ponderado ${(avgCtr * 100).toFixed(2)}% (vs mediana ${(ctrBm.median * 100).toFixed(2)}%) pero CVR ${(avgCvr * 100).toFixed(2)}% (vs mediana ${(cvrBm.median * 100).toFixed(2)}%). Los anuncios atraen pero el funnel post-click pierde.`,
        evidence: {
          metrics: [
            { name: "campañas afectadas", value: affected.length },
            { name: "CTR ponderado", value: avgCtr * 100, unit: "%", target: ctrBm.median * 100 },
            { name: "CVR ponderado", value: avgCvr * 100, unit: "%", target: cvrBm.median * 100 },
            { name: "spend afectado", value: totalAffectedSpend, unit: "MXN" },
          ],
          comparisons: [
            { dimension: "CTR vs mediana", delta: avgCtr - ctrBm.median, deltaPct: ((avgCtr - ctrBm.median) / (ctrBm.median || 1)) * 100 },
            { dimension: "CVR vs mediana", delta: avgCvr - cvrBm.median, deltaPct: ((avgCvr - cvrBm.median) / (cvrBm.median || 1)) * 100 },
          ],
          thresholds_triggered: ["ctr.above_benchmark", "cvr.below_benchmark"],
        },
        diagnosis: "Tres hipótesis en orden de probabilidad: (1) el landing no entrega lo que el ad promete (mensaje vs. oferta), (2) el formulario o flujo de compra tiene fricción, (3) el pixel/tracking está undercounting conversiones reales.",
        business_impact: `Se está gastando ${totalAffectedSpend.toFixed(0)} MXN atrayendo tráfico que no convierte a la tasa esperada. Si el CVR subiera a la mediana (${(cvrBm.median * 100).toFixed(2)}%), este grupo haría ${Math.round(totalClicks * cvrBm.median)} conversiones vs ${totalConversions} actuales (${Math.round(totalClicks * cvrBm.median - totalConversions)} adicionales).`,
        confidence: affected.length >= 3 ? "high" : "medium",
      },
      recommendations: [
        {
          category: "landing",
          action: `Auditar el landing page al que mandan las ${affected.length} campañas afectadas (empezando por ${top[0].campaign_name}): que el titular, imagen y CTA reflejen EXACTAMENTE la promesa del ad. Validar velocidad de carga mobile (<3s) y formulario con máximo 4 campos.`,
          rationale: "CTR alto confirma que el mensaje del ad funciona. El drop ocurre después del click.",
          expected_impact: "Si el landing es la causa, CVR podría subir a niveles de mediana → ~2–3× más conversiones sin cambiar spend.",
          urgency: "high",
          effort: "medium",
          confidence: "medium",
          risks: ["Si el problema no es el landing sino el tracking, la auditoría no resuelve"],
          dependencies: ["Equipo de producto/UX para ajustar landing", "Acceso a GA o pixel para validar eventos"],
          suggested_test: "A/B test del landing actual vs una versión alineada al mensaje del ad ganador. 50/50 durante 7 días, decidir por CVR.",
        },
        {
          category: "measurement",
          action: `Validar con Meta Events Manager que el evento de conversión está disparando correctamente y que la ventana de atribución no está truncando conversiones tardías (ajustar a 7d-click / 1d-view si está en 1d).`,
          rationale: "Descarta el escenario de tracking antes de invertir en cambios de landing.",
          expected_impact: "Si hay undercount, podrías descubrir que el CVR ya es bueno.",
          urgency: "medium",
          effort: "low",
          confidence: "high",
          risks: [],
          dependencies: ["Acceso a Events Manager de Meta"],
        },
      ],
    }];
  },
};
