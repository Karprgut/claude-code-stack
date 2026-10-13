import type { Insight, Recommendation } from "../schema";
import { RULES, type RuleContext } from "../rules";

export interface DiagnoseResult {
  insights: Insight[];
  recommendations: Recommendation[];
}

/**
 * Run every registered rule against the dataset and collect all insights +
 * recommendations. Assigns stable IDs and links recommendations to the
 * insight that spawned them.
 */
export function diagnose(ctx: RuleContext & { timeframeLabel: string }): DiagnoseResult {
  const insights: Insight[] = [];
  const recommendations: Recommendation[] = [];

  for (const rule of RULES) {
    const fired = rule.run(ctx);
    fired.forEach((hit, idx) => {
      const insightId = `${rule.id}.${idx + 1}`;
      insights.push({
        id: insightId,
        ...hit.insight,
        timeframe: hit.insight.timeframe || ctx.timeframeLabel,
      });
      hit.recommendations.forEach((rec, rIdx) => {
        recommendations.push({
          id: `${insightId}.rec.${rIdx + 1}`,
          linked_insight_id: insightId,
          ...rec,
        });
      });
    });
  }

  // Safety dedup — if two insights share the same rule prefix + normalized title,
  // merge their affected_entities and keep the first.
  const merged = new Map<string, Insight>();
  const redirectedIds = new Map<string, string>();
  for (const i of insights) {
    const prefix = i.id.split(".")[0];
    const titleKey = i.title.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
    const key = `${prefix}::${titleKey}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, i);
    } else {
      const extra = [i.entity_name, ...(i.affected_entities ?? [])].filter(Boolean);
      const combined = new Set([...(existing.affected_entities ?? []), existing.entity_name, ...extra]);
      combined.delete(existing.entity_name);
      existing.affected_entities = [...combined];
      redirectedIds.set(i.id, existing.id);
    }
  }
  const dedupedInsights = [...merged.values()];
  const dedupedRecs = recommendations.map((r) => {
    const redirect = redirectedIds.get(r.linked_insight_id);
    return redirect ? { ...r, linked_insight_id: redirect } : r;
  });

  return { insights: dedupedInsights, recommendations: dedupedRecs };
}
