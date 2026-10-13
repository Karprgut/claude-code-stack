# MongoDB Collection Schemas

Reference for all Flint MongoDB collections. ALWAYS match these schemas exactly when inserting data.

## engineer_scores
One document per engineer per day.
```json
{
  "engineer": "nombre-apellido",
  "date": "2026-04-13",
  "velocity": 7,
  "quality": 8,
  "reliability": 8,
  "communication": 9,
  "collaboration": 9,
  "initiative": 9,
  "technicalDepth": 8,
  "ownership": 9,
  "coachability": 8,
  "autonomy": 9,
  "attitude": 9,
  "overall": 8.5,
  "note": "Free text notes about today's performance",
  "determination": "Long-form reasoning explaining WHY each dimension got its score. Reference specific interactions, PRs, Jira activity, and engagement data. This is the evidence trail."
}
```

## director_scores
One document per director/persona de la agencia per day. Used by `/director-scores` for evaluating agency leadership with 6 dimensions tailored for agency directors (vs the 11 engineer dims).
```json
{
  "_id": "juan-ruiz_2026-04-17",
  "directorSlug": "juan-ruiz",
  "project": "ADG",
  "date": "2026-04-17",
  "responsiveness": 8,
  "delegation": 7,
  "strategicThinking": 9,
  "collaboration": 8,
  "execution": 7,
  "leadership": 9,
  "overall": 8.0,
  "note": "Free text observations",
  "determination": "Long-form markdown reasoning"
}
```
All scores 1-10, 10 = best. `_id` format: `<directorSlug>_<YYYY-MM-DD>`.

## manager_feedback
One document per day.
```json
{
  "date": "2026-04-13",
  "dimensions": {
    "delegation": 6,
    "growthConversations": 5,
    "biasAwareness": 8,
    "decisionQuality": 9,
    "peerDynamics": 10,
    "timeManagement": 7,
    "communication": 9,
    "strategicThinking": 9
  },
  "overall": 7.9,
  "topStrength": "text",
  "biggestGrowthArea": "text",
  "actionItem": "text",
  "determination": "Long-form reasoning explaining WHY each dimension got its score. Reference specific management decisions, interactions with reports/peers, and leadership moments. This is the evidence trail for the overall leadership assessment."
}
```

## daily_metrics
One document per day. Used by /metrics page.
```json
{
  "_id": "2026-04-13",
  "date": "2026-04-13",
  "tasks": { "completed": 32 },
  "tasksByProject": { "FC": 19, "FS": 5, "FVR": 1, "PER": 7 },
  "meetings": { "count": 6 },
  "health": {
    "mood": "Good",
    "score": 7.25,
    "moodScore": 8.5,
    "sleepScore": 6
  },
  "tracked": { "hours": 9.57, "target": 9 },
  "leadership": 7.9,
  "careerPulse": 9.5,
  "engineerScoreAvg": 7.2,
  "projects": {
    "fc": { "tasks_completed": 19, "prod_deploys": 0 },
    "fs": { "tasks_completed": 5 },
    "fvr": { "tasks_completed": 1, "hours_logged": 9.57 },
    "mcd": { "tasks_completed": 0 },
    "per": { "tasks_completed": 7 }
  }
}
```
Note: `health.score` = moodScore (NOT an average of mood+sleep). This is what the chart displays. MUST be present.

## mental_health
One document per day. camelCase fields. All `*Score`/`*Level` fields are 1-10
subjective self-ratings captured via the quick-capture "estado" mode (web + iOS).
Fields are upserted incrementally — sleep at start of day, mood at end of day.
```json
{
  "_id": "2026-04-13",
  "date": "2026-04-13",
  "mood": "Good",
  "moodScore": 8.5,
  "sleepNotes": "text",
  "sleepScore": 6,
  "sleepAid": "Benadryl",
  "stressScore": 4,
  "stressNotes": "text",
  "painScore": 2,
  "painLocation": "text",
  "hungerLevel": 5,
  "hungerNotes": "text",
  "notes": "optional text"
}
```
Note: **activityLevel is NOT stored here** — it's derived at read time in
`/api/health-history` from `apple_health_logs.activeMinutes` (60 min → 10),
normalized to 1-10 and surfaced alongside these in the Health snapshot.

## people_logs
One document per person per day.
```json
{
  "personId": "fc:nombre-apellido",
  "date": "2026-04-13",
  "title": "Short description",
  "entries": [
    { "text": "Full log entry text", "timestamp": "2026-04-13T10:00:00" }
  ]
}
```
Note: Tier 1 stakeholders (Yasel, Seb, Dan, Bryce, Becky) MUST have people_logs entries for the stakeholder pulse to track last interaction date.

## ai_usage
One document per API call. Logged automatically by the chat system.
```json
{
  "date": "2026-04-15",
  "timestamp": "2026-04-15T14:30:00.000Z",
  "model": "claude-sonnet",
  "modelId": "claude-sonnet-4-6",
  "provider": "anthropic",
  "inputTokens": 1500,
  "outputTokens": 800,
  "cost": 0.0165,
  "sessionId": "abc123",
  "source": "chat",
  "toolCalls": 2
}
```
Fields: `model` (registry slug), `modelId` (actual API model ID), `provider` (anthropic/openai/gemini/xai/deepseek/mistral), `source` (chat/router), `cost` in USD (calculated from token counts and per-model pricing). Router calls (Haiku classifier for auto mode) are logged with `source: "router"` and `model: "haiku-router"`.

## recurring_tasks
Recurring task definitions. Used by the morning checklist to auto-generate todos.
```json
{
  "_id": "rt_take-morning-pills",
  "text": "Take morning pills",
  "project": "PER",
  "priority": "first-thing",
  "cycle": "daily",
  "interval": null,
  "anchorDay": null,
  "lastTriggered": "2026-04-15",
  "nextDue": "2026-04-16",
  "notes": null,
  "active": true,
  "createdAt": "2026-04-15T00:00:00.000Z",
  "updatedAt": "2026-04-15T00:00:00.000Z"
}
```
Fields:
- `cycle`: `daily` | `weekly` | `biweekly` | `monthly` | `every_n_days`
- `interval`: only for `every_n_days` (e.g. 10, 15)
- `anchorDay`: day of week (0=Sun..6=Sat) for weekly/biweekly, day of month (1-31) for monthly, null for daily/every_n_days
- `priority`: `critical` | `first-thing` | `normal` | null
- `project`: `FC` | `FVR` | `FS` | `PER` | `MCD` (uppercase)
- `active`: true = will be triggered, false = paused
- `_id` format: `rt_` + slugified text

## system_config
Configuration documents. Each document has a unique `_id` that identifies the config type.

### user_profile
```json
{
  "_id": "user_profile",
  "name": "User",
  "timezone": "America/New_York",
  "colorblind": false,
  "dateFormat": "YYYY-MM-DD"
}
```

### projects
```json
{
  "_id": "projects",
  "items": [
    { "code": "WORK", "label": "Work", "color": "#2563eb" },
    { "code": "PER", "label": "Personal", "color": "#6b7280" }
  ]
}
```

### features
```json
{
  "_id": "features",
  "enabled": ["todos", "people", "daily_summaries", "weekly_summaries", "mental_health", "metrics", "recurring_tasks", "chat", "ai_memory"]
}
```

### managed_people
```json
{
  "_id": "managed_people",
  "engineers": [
    { "slug": "jane-doe", "project": "work", "name": "Jane Doe", "role": "Senior Engineer", "team": "Platform" }
  ]
}
```

## campaign_snapshots
Multi-platform ad spend snapshot. One document per ingest. The latest one (by `generatedAt`) is what the `/campaigns` page renders.
```json
{
  "_id": "snap_2026-04-16T16-51-00",
  "generatedAt": "2026-04-16T16:51:00.000Z",
  "platforms": {
    "meta": {
      "platform": "meta",
      "scrapedAt": "2026-04-16T16:51:00.000Z",
      "datePreset": "this_month",
      "accounts": [
        {
          "accountId": "act_<ID>",
          "accountName": "Kabrita",
          "clientCode": "KAB",
          "monthlyBudget": 89700,
          "mediaPlanUrl": "https://docs.google.com/...",
          "focusMetrics": ["results"],
          "totalSpend": 12345,
          "spendExcluded": 0,
          "totalBudget": 89700,
          "totalResults": 12,
          "totalClicks": 234,
          "totalEngagement": 0,
          "campaigns": [
            { "name": "...", "status": "active", "spend": 100, "budget": null, "budgetType": null, "impressions": 1000, "clicks": 10, "cpc": 10, "reach": null, "results": 1, "resultType": "actions:offsite_conversion.fb_pixel_purchase", "costPerResult": 100, "engagement": 0, "landingPageViews": null, "costPerLandingPageView": null }
          ]
        }
      ]
    }
  },
  "alerts": [
    { "severity": "high", "type": "monthly_budget_exceeded", "platform": "meta", "account": "Kabrita", "campaign": "all", "message": "Monthly budget exceeded" }
  ]
}
```
Notes:
- `platforms` is keyed by platform slug (`meta`, `google-ads`, `tiktok`)
- `alerts` is computed at ingest time
- `_id` format: `snap_` + ISO timestamp with colons replaced by hyphens

## meta_ad_snapshots
Ad-level Meta snapshot. One document per ingest. The latest one drives `/creatives`.
```json
{
  "_id": "metaads_2026-04-15T12-47-00",
  "platform": "meta",
  "scrapedAt": "2026-04-15T12:47:00.000Z",
  "accounts": [
    {
      "accountId": "act_<ID>",
      "accountName": "Kabrita",
      "clientCode": "KAB",
      "focusMetrics": ["results"],
      "totalSpend": 12345,
      "ads": [
        {
          "name": "pr_rewards_rep_abril",
          "campaignName": null,
          "adsetName": null,
          "status": "active",
          "spend": 1638.08,
          "impressions": 23817,
          "clicks": 224,
          "ctr": 0.94,
          "cpc": 7.31,
          "results": 2,
          "resultType": "actions:offsite_conversion.fb_pixel_purchase",
          "resultLabel": "Compras",
          "resultIcon": "shopping-cart",
          "resultCategory": "conversion",
          "costPerResult": 819.04,
          "engagement": 0,
          "thumbnailUrl": null
        }
      ]
    }
  ]
}
```
Notes:
- `_id` format: `metaads_` + ISO timestamp with colons replaced by hyphens

## food_log
One document per meal entry.
```json
{
  "_id": "food_2026-04-16T13-00-00",
  "date": "2026-04-16",
  "meal": "lunch",
  "what": "ensalada de pollo + agua de jamaica",
  "createdAt": "2026-04-16T13:00:00.000Z"
}
```
Notes:
- `meal`: `breakfast` | `lunch` | `dinner` | `snack`
- `_id` format: `food_` + ISO timestamp with colons replaced by hyphens
- Add via: `node scripts/mongo-cli.mjs raw insert food_log '<json>'`

## exercise_log
One document per workout entry.
```json
{
  "_id": "exer_2026-04-16T07-30-00",
  "date": "2026-04-16",
  "activity": "spinning",
  "notes": "45 min, intervalos",
  "createdAt": "2026-04-16T07:30:00.000Z"
}
```
Notes:
- `activity`: free text — common values: spinning, yoga, walk, gym, pilates
- `_id` format: `exer_` + ISO timestamp with colons replaced by hyphens
- Add via: `node scripts/mongo-cli.mjs raw insert exercise_log '<json>'`

## client_health
One document per client per day. Used by `/client-health` to track client relationship health (KCL clients).
```json
{
  "_id": "KAB_2026-04-16",
  "clientCode": "KAB",
  "date": "2026-04-16",
  "paymentReliability": 8,
  "responsiveness": 6,
  "briefQuality": 7,
  "collaboration": 9,
  "feedbackQuality": 7,
  "technicalLiteracy": 5,
  "predictability": 6,
  "respectfulness": 9,
  "overall": 7.1,
  "note": "Free text observations for the day",
  "determination": "Long-form markdown reasoning explaining WHY each dimension got its score. Reference specific incidents, briefs, payments, conversations."
}
```
All scores 1-10, 10 = best. `collaboration` is inverse of "peleoner@" (higher = easier to work with). `predictability` is inverse of "bomberazos" (higher = fewer fires).
- `_id` format: `<clientCode>_<YYYY-MM-DD>`
- Add via: `node scripts/mongo-cli.mjs raw insert client_health '<json>'`

## calendar_events
External calendar events synced from ICS feeds (Ladón Outlook, KCL/Personal Google).
One document per event occurrence (recurring events expand to one doc per occurrence within a horizon).
```json
{
  "_id": "KAB:abc123def@google.com:2026-04-17",
  "calendarTag": "KAB",
  "uid": "abc123def@google.com",
  "title": "Sync Kabrita semanal",
  "start": "2026-04-17T15:00:00.000Z",
  "end": "2026-04-17T16:00:00.000Z",
  "allDay": false,
  "location": "Google Meet",
  "description": "...",
  "url": "https://meet.google.com/abc-defg-hij",
  "scrapedAt": "2026-04-17T05:00:00.000Z"
}
```
- `calendarTag`: which calendar — `KAB` (Ladón), `KCL`, `PER`, `ADG`, `TBP`
- `_id` format: `<tag>:<uid>:<startDate>` so recurring instances are distinct
- Sync is idempotent — re-running upserts same `_id`
- Synced via cron `/api/cron/calendar-sync` every hour

## ad_clients
Client config (Kabrita, Ruth's Chris, TBP). One doc per client.
```json
{
  "_id": "KAB",
  "code": "KAB",
  "name": "Kabrita",
  "project": "KCL",
  "metaAccountId": "act_<ID>",
  "googleCustomerId": "458-921-8366",
  "googleSessionKey": "ladon",
  "tiktokAdvertiserId": "<ADVERTISER_ID>",
  "monthlyBudget": { "meta": 89700, "google": 85800, "tiktok": 19500 },
  "focusMetrics": ["results"],
  "mediaPlanUrl": "https://docs.google.com/...",
  "notes": "...",
  "excludeFromMonthlyBudget": ["Portfolio", "Vacante"]
}
```
