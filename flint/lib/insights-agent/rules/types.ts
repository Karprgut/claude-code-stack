import type { CanonicalRow } from "../config/canonical-schema";
import type { Benchmark } from "../engine/metrics";
import type { Insight, Recommendation } from "../schema";

export interface RuleContext {
  rows: CanonicalRow[];                    // all rows enriched with derived metrics
  benchmarks: Record<string, Benchmark>;   // precomputed benchmarks (median/MAD)
  timeframe: { since: string; until: string };
}

/**
 * A rule examines the dataset and, if it fires, emits one or more
 * (Insight, Recommendation[]) pairs. Keep rules pure and idempotent.
 */
export interface Rule {
  id: string;                              // stable id, e.g. "fatigue"
  name: string;                            // human label
  run: (ctx: RuleContext) => Array<{
    insight: Omit<Insight, "id">;
    recommendations: Array<Omit<Recommendation, "id" | "linked_insight_id">>;
  }>;
}
