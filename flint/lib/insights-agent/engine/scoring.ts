import type { Insight, Recommendation } from "../schema";

/**
 * Opportunity score — composite of severity, spend exposure, confidence,
 * and urgency. Used for downstream prioritization.
 */

export function insightScore(insight: Insight): number {
  const confidenceWeight = { high: 1.0, medium: 0.6, low: 0.3 }[insight.confidence];
  const spendExposure = insight.evidence.metrics.find((m) => m.unit === "MXN" || /spend/i.test(m.name))?.value ?? 0;
  const triggerCount = insight.evidence.thresholds_triggered.length;
  // Log-dampen spend so one huge account doesn't dominate the ranking
  const spendComponent = spendExposure > 0 ? Math.log10(spendExposure + 10) : 0;
  return confidenceWeight * (spendComponent * 2 + triggerCount);
}

export function recommendationScore(rec: Recommendation): number {
  const urgencyW = { high: 3, medium: 2, low: 1 }[rec.urgency];
  const effortW = { high: 1, medium: 2, low: 3 }[rec.effort]; // inverted — low effort is better
  const confidenceW = { high: 3, medium: 2, low: 1 }[rec.confidence];
  return urgencyW + effortW + confidenceW;
}
