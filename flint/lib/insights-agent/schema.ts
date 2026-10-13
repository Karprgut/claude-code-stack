/**
 * JSON schema for the insights agent output.
 * Mirror this shape in any consumer (UI, PDF export, API).
 */

export type Confidence = "high" | "medium" | "low";
export type Urgency = "high" | "medium" | "low";
export type Effort = "high" | "medium" | "low";

export type EntityLevel = "account" | "campaign" | "adset" | "ad" | "audience" | "placement" | "creative";

export type RecommendationCategory =
  | "budget"
  | "bidding"
  | "audiences"
  | "creative"
  | "placements"
  | "structure"
  | "measurement"
  | "landing"
  | "pacing"
  | "testing";

/** A quantitative metric that triggered an insight. */
export interface Evidence {
  metrics: Array<{
    name: string;          // e.g. "CTR", "CPA", "frequency"
    value: number;
    unit?: string;         // "%", "MXN", "count"
    target?: number;       // benchmark or expected value
  }>;
  comparisons: Array<{
    dimension: string;     // e.g. "vs median", "vs last_period"
    delta: number;
    deltaPct?: number;
  }>;
  thresholds_triggered: string[]; // rule IDs that fired
}

export interface Insight {
  id: string;
  title: string;
  entity_level: EntityLevel;
  entity_name: string;      // primary label — "cuenta" or the single campaign name when scoped
  entity_id?: string;
  /**
   * When the same pattern hits several entities, list them all here.
   * The UI renders these as pills under the title so one insight card
   * replaces many duplicates. Entity names can be any granularity label
   * (campaign, adset, ad, audience, etc.).
   */
  affected_entities?: string[];
  timeframe: string;        // "2026-04-01 / 2026-04-20"
  observation: string;      // what happened
  evidence: Evidence;
  diagnosis: string;        // probable cause
  business_impact: string;  // what it means for revenue / efficiency
  confidence: Confidence;
}

export interface Recommendation {
  id: string;
  linked_insight_id: string;
  category: RecommendationCategory;
  action: string;           // concrete action: "shift 30% of X's budget to Y"
  rationale: string;        // strategic reason
  expected_impact: string;  // "CPA -10 to -15% over 14 days"
  urgency: Urgency;
  effort: Effort;
  confidence: Confidence;
  risks: string[];
  dependencies: string[];
  suggested_test?: string;
}

export interface InsightsOutput {
  /** Meta about the run */
  meta: {
    accountId: string;
    accountName: string;
    clientSlug?: string;
    timeframe: { since: string; until: string };
    platform: string;          // "meta" | "google" | "tiktok" | etc
    generatedAt: string;       // ISO
    dataPoints: {
      campaigns: number;
      adsets?: number;
      ads?: number;
    };
  };

  summary: {
    account_health: string;       // 1-2 sentence high-level read
    primary_findings: string[];   // 2-5 bullets
    main_risks: string[];
    main_opportunities: string[];
  };

  insights: Insight[];
  recommendations: Recommendation[];

  prioritization: {
    quick_wins: string[];          // array of recommendation IDs
    strategic_bets: string[];
    defensive_actions: string[];
    tests: string[];
  };

  data_quality_flags: Array<{
    severity: "warn" | "error";
    message: string;
    affectedEntities?: string[];
  }>;

  limitations: string[];
}
