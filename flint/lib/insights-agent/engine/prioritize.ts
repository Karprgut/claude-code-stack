import type { Recommendation, InsightsOutput } from "../schema";
import { recommendationScore } from "./scoring";

/**
 * Four-quadrant prioritization:
 *  - quick_wins:     high urgency + low effort
 *  - strategic_bets: high impact + higher effort
 *  - defensive:      prevents loss (urgency high, risks listed)
 *  - tests:          suggested_test present AND confidence != high
 */
export function prioritize(recs: Recommendation[]): InsightsOutput["prioritization"] {
  const quickWins: Array<{ id: string; score: number }> = [];
  const strategicBets: Array<{ id: string; score: number }> = [];
  const defensive: Array<{ id: string; score: number }> = [];
  const tests: Array<{ id: string; score: number }> = [];

  for (const r of recs) {
    const score = recommendationScore(r);
    const inBudgetCategory = r.category === "budget" || r.category === "measurement";

    if (r.urgency === "high" && r.effort === "low") {
      quickWins.push({ id: r.id, score });
    }
    if (r.urgency === "high" && (r.risks.length > 0 || inBudgetCategory)) {
      defensive.push({ id: r.id, score: score + 1 });
    }
    if (r.confidence !== "high" && r.suggested_test) {
      tests.push({ id: r.id, score });
    }
    if ((r.effort === "medium" || r.effort === "high") && r.confidence !== "low") {
      strategicBets.push({ id: r.id, score });
    }
  }

  const sortDesc = (a: { score: number }, b: { score: number }) => b.score - a.score;
  const dedupe = (arr: Array<{ id: string }>) => Array.from(new Set(arr.map((x) => x.id)));

  return {
    quick_wins: dedupe(quickWins.sort(sortDesc)),
    strategic_bets: dedupe(strategicBets.sort(sortDesc)),
    defensive_actions: dedupe(defensive.sort(sortDesc)),
    tests: dedupe(tests.sort(sortDesc)),
  };
}
