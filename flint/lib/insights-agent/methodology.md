# Methodology — Paid Media Insights Agent

An opinionated 6-phase analysis pipeline for performance marketing data.
The agent does NOT narrate a dashboard. It diagnoses, explains, and
prescribes — like a senior strategist reviewing your account before
a QBR.

## Design principles

- **Evidence-first**: every insight cites the metric that triggered it.
- **Hypothesis vs. conclusion**: we mark whether something is observed,
  inferred, or still to be validated.
- **No vague advice**: recommendations must include the action, the
  reasoning, expected impact, urgency, effort, and risks.
- **Humble**: when data is thin, the agent says so and recommends
  validation before scaling decisions.
- **Funnel-stage aware** (non-negotiable): results from awareness
  (reach, video views), consideration (link clicks, engagement) and
  conversion (purchases, leads) campaigns are NEVER compared
  head-to-head. A link-click campaign with 10k results is not "more
  efficient" than a purchase campaign with 50 results — those results
  mean different things. Every rule that ranks entities by volume or
  cost-per-result must first segment by `funnel_stage` and only
  compare within stage. The LLM synthesis step carries the same rule.

## The 6 phases

### Phase 1 — Normalization & Context
- Map incoming columns to a **canonical schema** (see `config/canonical-schema.ts`).
- Detect granularity levels present: account, campaign, adset, ad,
  audience, placement, creative, date.
- Detect campaign objective when declared: awareness, traffic, lead,
  sale, app_install, video_view, engagement.
- Detect time window and compare-to window if provided.
- Validate data quality: nulls, duplicates, impossible values
  (negative spend, CTR > 100%, conversions with zero spend, etc.).
  Any failure is reported as a `data_quality_flags` entry.
- If key metrics are missing, register a limitation — we do not guess.

### Phase 2 — Performance Reading
Compute a standard set of derived metrics per entity:

- CTR = clicks / impressions
- CPC = spend / clicks
- CPM = spend / impressions × 1000
- CVR = conversions / clicks
- CPA / CPL = spend / conversions (label adapts to objective)
- ROAS = revenue / spend (when revenue is present)
- Frequency = impressions / reach (when reach is present)

Compare each value against:

- the campaign's declared objective,
- an internal benchmark computed across the dataset (median ± MAD),
- previous period if dates are available,
- relative ranking across peers (campaigns, audiences, creatives, etc.).

### Phase 3 — Diagnosis
Translate patterns into **insights**. Each insight has a title, what
happened, the numeric evidence, a probable cause, the business impact,
and a confidence level.

Examples of patterns the agent recognizes:

- **Creative fatigue**: frequency ↑ + CTR ↓ + CPA ↑
- **Budget fragmentation**: many entities with low spend per entity
- **Post-click leak**: high CTR + low CVR → landing/funnel issue
- **Winner concentration**: top 1–2 creatives driving most ROAS
- **Learning instability**: < 50 events in 7 days, unstable delivery
- **Low-quality cheap placement**: low CPM but low CVR
- **Cannibalization**: two campaigns bidding on overlapping intent
- **Temporal anomaly**: spike/dip on a specific day

### Phase 4 — Optimization
For each relevant insight, emit one or more **recommendations**.
Categories:

- budget · bidding · audiences · creative · placements
- structure · measurement · landing · pacing · testing

Each recommendation includes action, rationale, evidence link,
expected impact, urgency, effort, confidence, risks, dependencies,
and a suggested experiment when appropriate.

### Phase 5 — Prioritization
Build a four-quadrant prioritization:

- **Quick wins**: high impact, high confidence, low effort
- **Strategic bets**: high impact, medium confidence, medium-high effort
- **Defensive actions**: actions that prevent loss (e.g. kill wasted spend)
- **Tests**: hypotheses worth validating before scaling

Ranking signals: impact, confidence, ease, dependencies, risk of losing
volume.

### Phase 6 — Structured Output
Return a JSON document that matches `schema.ts`. Consumers can render it
as Spanish/English narrative, as a PDF, or as a Slack digest.

## Non-goals

- We do NOT automate execution (no programmatic changes to the platform).
- We do NOT produce causal claims without sufficient evidence.
- We do NOT repeat the numbers the user already sees on the dashboard.
