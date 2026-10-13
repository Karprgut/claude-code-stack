# Campaigns — Technical Documentation

Deep-dive on how Flint ingests and renders multi-platform ad data. For token setup / rotation see [MARKETING_APIS.md](MARKETING_APIS.md).

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  EXTERNAL APIs                                                      │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐                   │
│  │  Meta      │   │  Google    │   │  TikTok    │                   │
│  │  Graph API │   │  Ads API   │   │  Mkt API   │                   │
│  │  v21.0     │   │  v22       │   │  v1.3      │                   │
│  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘                   │
│        │                │                │                          │
└────────┼────────────────┼────────────────┼──────────────────────────┘
         │                │                │
         ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CRON ENDPOINTS (Next.js API routes, x-cron-secret gated)           │
│  /api/cron/meta-sync    /api/cron/google-sync    /api/cron/tt-sync  │
│         │                      │                       │            │
│         └──────────────────────┴───────────────────────┘            │
│                            │                                        │
│                            ▼                                        │
│              Merge with previous snapshot                           │
│              (each cron replaces only its own platform block)       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MongoDB Atlas — collection: campaign_snapshots                     │
│  one doc per sync, sorted by generatedAt                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                           │
│  Web:  /campaigns (SSR, force-dynamic) ──→ reads latest snapshot    │
│  iOS:  CampaignsView ──→ GET /api/campaigns                         │
└─────────────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

- **One snapshot, three platforms.** Each cron replaces only its own platform key. Frontend reads the latest snapshot and renders whatever is present. Loose coupling: a broken TikTok sync doesn't affect Meta or Google data.
- **SSR, not client-side fetch.** `/campaigns` is a server component that queries Mongo directly — no extra hop through an API route.
- **All math on ingest, no compute on read.** Totals, alerts, and budget percentages are computed once per sync and stored in the snapshot. The frontend just renders.

---

## 2. Data model

### `campaign_snapshots` collection

```typescript
{
  _id: string;                // "snap_2026-04-17T18-47-42"
  generatedAt: string;        // ISO timestamp
  platforms: {
    meta?: PlatformSnapshot;
    "google-ads"?: PlatformSnapshot;
    tiktok?: PlatformSnapshot;
  };
  alerts: Alert[];
}

type PlatformSnapshot = {
  platform: "meta" | "google-ads" | "tiktok";
  scrapedAt: string;          // ISO timestamp of when THIS platform synced
  datePreset: string;         // "this_month" | "this_week" | etc
  source: "graph-api" | "google-ads-api" | "tiktok-api" | "csv";
  accounts: AccountSnapshot[];
}

type AccountSnapshot = {
  accountId: string;          // platform-specific: "act_<ID>" (Meta), "1234567890" (Google), "0987654321" (TikTok)
  accountName: string;        // "act_<ID> · Kabrita"
  clientCode: "KAB" | "RTH" | "TBP" | null;
  monthlyBudget: number | null;
  mediaPlanUrl: string | null;
  focusMetrics: Array<"link_clicks" | "engagement" | "results">;
  totalSpend: number;
  spendExcluded: number;      // spend on campaigns listed in excludeFromMonthlyBudget
  totalBudget: number;        // sum of per-campaign budgets
  totalResults: number;
  totalClicks: number;
  totalEngagement: number;
  campaigns: Campaign[];
}

type Campaign = {
  name: string;
  status: string;
  spend: number | null;
  budget: number | null;
  budgetType: "Daily" | "Lifetime" | null;
  impressions: number | null;
  clicks: number | null;
  cpc: number | null;
  reach: number | null;
  results: number | null;
  resultType: string | null;  // "actions:offsite_conversion.fb_pixel_purchase"
  costPerResult: number | null;
  engagement: number | null;
  landingPageViews: number | null;
  costPerLandingPageView: number | null;
}

type Alert = {
  severity: "high" | "medium";
  type: "monthly_budget_exceeded" | "monthly_budget_warning";
  platform: string;
  account: string;
  campaign: string;
  message: string;            // pre-formatted in es-MX
}
```

### `ad_clients` collection (per-client config)

Source of truth for which clients exist, their budgets, and their focus metrics.

```typescript
{
  _id: string;
  code: "KAB" | "RTH" | "TBP" | ...;
  name: string;
  project: "ADG" | "KCL";
  metaAccountId?: string;           // "act_<ID>"
  googleCustomerId?: string;        // "1234567890" (no dashes)
  tiktokAdvertiserId?: string;      // platform-assigned ID
  monthlyBudget: {
    meta?: number;
    google?: number;
    tiktok?: number;
  };
  focusMetrics: Array<"link_clicks" | "engagement" | "results">;
  mediaPlanUrl?: string;
  excludeFromMonthlyBudget?: string[];  // substring match against campaign names
  notes?: string;
}
```

**Current state:** The Meta integration uses a hardcoded `CLIENTS` array in `meta-api.ts` (see [§3](#3-meta-implementation-current)). Migrating to `ad_clients` is pending — the collection schema is in place but `syncAllMeta()` doesn't query it yet. **This needs to be unified before Google Ads ships** so we don't duplicate the client list in three places.

---

## 3. Meta implementation (current)

**Files:**
- [dashboard/lib/meta-api.ts](../dashboard/lib/meta-api.ts) — API client
- [dashboard/app/api/cron/meta-sync/route.ts](../dashboard/app/api/cron/meta-sync/route.ts) — cron endpoint
- [dashboard/app/campaigns/page.tsx](../dashboard/app/campaigns/page.tsx) — UI

### Flow per account

```typescript
fetchAccount(cfg) → {
  // 1. List campaigns (active + paused)
  GET /v21.0/{act_id}/campaigns
    ?fields=id,name,status,effective_status,daily_budget,lifetime_budget
    &effective_status=["ACTIVE","PAUSED"]
    &limit=500

  // 2. Insights this month, grouped by campaign
  GET /v21.0/{act_id}/insights
    ?level=campaign
    &time_range={"since":"2026-04-01","until":"2026-04-17"}
    &fields=campaign_id,campaign_name,spend,impressions,clicks,cpc,reach,actions

  // 3. Join on campaign_id, extract top-priority result type from actions[]
  // 4. Filter to campaigns with spend > 0 this month
  // 5. Return AccountSnapshot
}
```

### Result type priority

Meta returns every conversion type in the `actions` array. We collapse that into **one** `results` number per campaign using this priority:

1. `offsite_conversion.fb_pixel_purchase`
2. `offsite_conversion.fb_pixel_lead`
3. `onsite_conversion.purchase`
4. `leadgen.other`
5. `link_click`
6. `post_engagement`
7. (fallback) first action in the array

The winning action type is stored in `resultType` so the UI can display e.g. "123 leadgen.other" instead of "123 results".

### Budget normalization

Meta returns budgets in **cents** (smallest currency unit). We divide by 100 on ingest so everything downstream is in pesos. Daily budget takes precedence over lifetime if both are set.

### Excluded campaigns

Some clients run secondary campaigns (portfolio, recruiting) that share the ad account but come out of a different budget. `excludeFromMonthlyBudget` matches campaign names by substring — matched campaigns still sync but their spend goes to `spendExcluded`, not `totalSpend`.

### Cron endpoint

```typescript
// POST or GET /api/cron/meta-sync (x-cron-secret required if CRON_SECRET set)
async function handler(req) {
  checkSecret(req);
  const result = await syncAllMeta();         // hit Meta API for all clients
  const previous = await getLatestSnapshot(); // for merging
  const platforms = {
    meta: { platform: "meta", scrapedAt: now, accounts: result.accounts, source: "graph-api" },
    ...(previous.tiktok ? { tiktok: previous.tiktok } : {}),
    ...(previous["google-ads"] ? { "google-ads": previous["google-ads"] } : {}),
  };
  const alerts = computeAlerts(platforms);    // 80%/100% thresholds
  await writeSnapshot(platforms, alerts);
  return { ok, snapshot, accounts, errors, alerts };
}
```

### Budget alert logic

```typescript
for each account in each platform:
  if account.monthlyBudget > 0:
    pct = account.totalSpend / account.monthlyBudget * 100
    if pct >= 100: alert severity="high"  type="monthly_budget_exceeded"
    elif pct >= ALERT_BUDGET_PCT (default 80): alert severity="medium" type="monthly_budget_warning"
```

Alerts are stored with the snapshot. The UI shows them in a red-bordered card at the top of `/campaigns`.

---

## 4. Google Ads implementation (planned)

**Status:** Developer Token obtained (Test mode). OAuth2 credentials pending. No code yet.

### 4.1 Auth model

Google Ads API uses **4 credentials** simultaneously, all sent on every request:

| Credential | How it's obtained | Where it lives |
|---|---|---|
| Developer Token | Apply in Google Ads MCC → API Center | `GOOGLE_ADS_DEVELOPER_TOKEN` |
| OAuth2 Client ID + Secret | Google Cloud Console → Credentials → OAuth client ID (Desktop app) | `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET` |
| Refresh Token | Run OAuth flow once locally, save the resulting refresh_token | `GOOGLE_ADS_REFRESH_TOKEN` |
| Login Customer ID (MCC) | The 10-digit ID of the Manager Account | `GOOGLE_ADS_LOGIN_CUSTOMER_ID` |

Per-client Customer IDs (the actual ad accounts) are the 10-digit `googleCustomerId` in `ad_clients`.

### 4.2 Request anatomy

Every request follows this pattern:

```http
POST https://googleads.googleapis.com/v22/customers/{customerId}/googleAds:searchStream
Authorization: Bearer {access_token}        ← exchanged from refresh_token each run
developer-token: {GOOGLE_ADS_DEVELOPER_TOKEN}
login-customer-id: {MCC_CUSTOMER_ID}
Content-Type: application/json

{
  "query": "SELECT ... FROM campaign WHERE ..."
}
```

**Access token exchange** (refresh → access, ~1h lifetime):

```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&refresh_token={REFRESH_TOKEN}
&grant_type=refresh_token
```

The refresh token itself is permanent (revoked only if the user removes Flint's access from their Google account).

### 4.3 GAQL queries

Google Ads API uses **GAQL** (Google Ads Query Language) — SQL-like but with specific tables.

**Campaign list + spend this month:**

```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign_budget.amount_micros,
  campaign_budget.period,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.average_cpc,
  metrics.conversions,
  metrics.all_conversions,
  metrics.engagements
FROM campaign
WHERE
  segments.date BETWEEN '2026-04-01' AND '2026-04-17'
  AND campaign.status IN ('ENABLED', 'PAUSED')
```

**Key details:**

- **Money in micros.** `amount_micros` and `cost_micros` are multiplied by 1,000,000. Divide by 1M to get pesos.
- **Date is a segment, not a filter.** `segments.date` implicitly groups results by day. To get a month total, sum `cost_micros` across the returned rows per campaign.
- **Conversions vs all_conversions.** `conversions` = those marked "include in conversions". `all_conversions` = all tracked, regardless of the flag. Flint uses `all_conversions` to match what Meta shows.
- **searchStream is the cheap endpoint.** Use `googleAds:searchStream` instead of `googleAds:search` — it returns results as a stream, no paging, no token-per-request counting.

### 4.4 Mapping GAQL → AccountSnapshot

This is the translation layer from Google's shape to our canonical `AccountSnapshot`:

| Our field | GAQL source | Transform |
|---|---|---|
| `accountId` | customer.id | `String(customer.id)` — 10 digits |
| `accountName` | customer.descriptive_name | — |
| `clientCode` | (look up by googleCustomerId in ad_clients) | — |
| `monthlyBudget` | ad_clients.monthlyBudget.google | — |
| `focusMetrics` | ad_clients.focusMetrics | — |
| `totalSpend` | sum(metrics.cost_micros) / 1_000_000 | aggregate all rows |
| `totalResults` | sum(metrics.all_conversions) | aggregate |
| `totalClicks` | sum(metrics.clicks) | aggregate |
| `totalEngagement` | sum(metrics.engagements) | aggregate |
| `campaigns[].name` | campaign.name | — |
| `campaigns[].status` | campaign.status | "ENABLED" → "ACTIVE" to match Meta |
| `campaigns[].spend` | metrics.cost_micros / 1_000_000 | per-campaign sum |
| `campaigns[].budget` | campaign_budget.amount_micros / 1_000_000 | — |
| `campaigns[].budgetType` | campaign_budget.period | "DAILY" or "CUSTOM_PERIOD" |
| `campaigns[].impressions` | metrics.impressions | per-campaign sum |
| `campaigns[].clicks` | metrics.clicks | per-campaign sum |
| `campaigns[].cpc` | metrics.average_cpc / 1_000_000 | — |
| `campaigns[].reach` | (not available for Google Search/Display) | `null` |
| `campaigns[].results` | metrics.all_conversions | per-campaign sum |
| `campaigns[].resultType` | "google:conversions" | static |
| `campaigns[].costPerResult` | spend / results | computed |
| `campaigns[].engagement` | metrics.engagements | per-campaign sum |
| `campaigns[].landingPageViews` | (not applicable to Google Ads) | `null` |
| `campaigns[].costPerLandingPageView` | — | `null` |

**Things Google Ads doesn't have that Meta does:**

- **Reach** (unique users) — Google Search/Display campaigns don't expose this. Only YouTube and some Demand Gen campaigns do, via a different field.
- **Landing page views** — Meta-specific concept. Closest Google equivalent is `metrics.conversions_from_interactions_rate`.

Fill these with `null` and the UI treats them as "—" already.

### 4.5 Planned file layout

```
dashboard/lib/google-ads-api.ts         # client, fetchAccount(), syncAllGoogle()
dashboard/app/api/cron/google-sync/     # cron endpoint
  route.ts
dashboard/scripts/google-ads-auth.mjs   # one-time OAuth flow to get refresh_token
dashboard/scripts/google-ads-test.mjs   # local test: pull one account's data
```

### 4.6 Implementation sketch

```typescript
// dashboard/lib/google-ads-api.ts

const API_VERSION = "v22";
const BASE = `https://googleads.googleapis.com/${API_VERSION}`;

async function getAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`OAuth token: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function searchStream<T>(customerId: string, query: string, accessToken: string): Promise<T[]> {
  const res = await fetch(`${BASE}/customers/${customerId}/googleAds:searchStream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Google Ads ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.flatMap((chunk: any) => chunk.results ?? []) as T[];
}

export async function fetchGoogleAccount(cfg: ClientConfig): Promise<AccountSnapshot> {
  const token = await getAccessToken();
  const query = `
    SELECT
      campaign.id, campaign.name, campaign.status,
      campaign_budget.amount_micros, campaign_budget.period,
      metrics.cost_micros, metrics.impressions, metrics.clicks,
      metrics.average_cpc, metrics.all_conversions, metrics.engagements
    FROM campaign
    WHERE segments.date BETWEEN '${firstDayOfMonth()}' AND '${todayISO()}'
      AND campaign.status IN ('ENABLED', 'PAUSED')
  `;
  const rows = await searchStream(cfg.googleCustomerId, query, token);

  // Group rows by campaign.id, aggregate metrics, build Campaign[], sum totals.
  // ... (same shape as meta-api.ts, just different source)

  return {
    accountId: cfg.googleCustomerId,
    accountName: `${cfg.googleCustomerId} · ${cfg.name}`,
    clientCode: cfg.code,
    monthlyBudget: cfg.monthlyBudget.google ?? null,
    mediaPlanUrl: cfg.mediaPlanUrl ?? null,
    focusMetrics: cfg.focusMetrics,
    totalSpend, totalResults, totalClicks, totalEngagement,
    spendExcluded: 0, totalBudget,
    campaigns,
  };
}
```

### 4.7 Rate limits

Google Ads API has **soft daily quotas** based on access level:

- **Test** (default): 15,000 operations/day, test accounts only
- **Basic**: 15,000 operations/day, production accounts
- **Standard**: 1,000,000 operations/day

One `searchStream` counts as 1 operation regardless of rows returned. With 3 clients × 8 syncs/day (every 3h), we use 24 ops/day — well under Basic.

---

## 5. TikTok implementation (planned, blocked)

**Status:** Blocked on TikTok app review. No code yet.

### 5.1 Auth model

TikTok's access token flow is advertiser-scoped:

1. App gets `App ID` + `App Secret` (after review approval)
2. For each advertiser, run OAuth flow: advertiser authorizes Flint → we get a long-lived `access_token`
3. All API calls include:
   - `Access-Token: {access_token}` header
   - `advertiser_id` as a query param

### 5.2 Endpoints we'll use

```
GET /open_api/v1.3/campaign/get/
  ?advertiser_id={id}&page_size=1000

GET /open_api/v1.3/report/integrated/get/
  ?advertiser_id={id}
  &report_type=BASIC
  &dimensions=["campaign_id"]
  &metrics=["spend","impressions","clicks","conversions","cpc"]
  &start_date=2026-04-01&end_date=2026-04-17
  &page_size=1000
```

Two requests per advertiser, same shape as Meta. Join on `campaign_id`. Spend is in whatever currency the advertiser uses, **not** in micros like Google.

### 5.3 Mapping

| Our field | TikTok source |
|---|---|
| `accountId` | advertiser_id |
| `totalSpend` | report.spend |
| `totalResults` | report.conversions |
| `totalClicks` | report.clicks |
| `campaigns[].spend` | per-campaign report row |
| `campaigns[].reach` | report.reach (TikTok has this, unlike Google) |
| `campaigns[].results` | report.conversions |
| `campaigns[].resultType` | "tiktok:conversions" |
| `campaigns[].engagement` | report.video_views (TikTok's closest equivalent) |

### 5.4 Fallback: CSV import

Until the TikTok app is approved, the legacy Playwright scraper (or manual CSV drop at `ops/campaigns/_downloads/{client}/`) handles TikTok. The CSV parser lives in `ops/campaigns/scrapers/tiktok-csv.ts` (if present) and writes snapshots with `source: "csv"`.

---

## 6. Frontend contract

### Web — `/campaigns` (SSR)

[dashboard/app/campaigns/page.tsx](../dashboard/app/campaigns/page.tsx) reads the latest snapshot directly from MongoDB:

```typescript
const latest = await db.collection(campaign_snapshots)
  .find({})
  .sort({ generatedAt: -1 })
  .limit(1)
  .toArray();
```

It renders 4 sections:

1. **Stat cards** — active clients, active campaigns, total spend, alert count
2. **Alerts panel** (if `alerts.length > 0`) — red-bordered card listing each alert
3. **Per-platform sections** — one per `Object.keys(platforms)`, each containing:
4. **Per-account cards** — budget bar, focus-metric stats, campaign table

The campaign table's columns adapt to `focusMetrics`:
- `results` → shows "Resultados" + "Costo/resultado"
- `link_clicks` → shows "Clics" + "CPC"
- `engagement` → shows "Engagement"

### API — `/api/campaigns` (for iOS)

[dashboard/app/api/campaigns/route.ts](../dashboard/app/api/campaigns/route.ts) returns the raw latest snapshot as JSON:

```typescript
GET /api/campaigns
→ { generatedAt, platforms, alerts }
```

No transformation, no filtering. The iOS `CampaignsView` (once built) will consume this and render the same structure natively.

### iOS — planned

```
ios/Flint/Features/Campaigns/
  CampaignsView.swift        // top-level list of platforms
  CampaignsAccountCard.swift // per-account card with budget bar
  CampaignsTable.swift       // campaign rows
  CampaignsAlertsBanner.swift
  CampaignsModel.swift       // Codable structs matching AccountSnapshot/Campaign/Alert
```

iOS mirrors the data exactly — no special mobile logic.

---

## 7. Deployment

Production runs on EC2 in a Docker container. The cron schedule lives at `/etc/cron.d/flint-campaigns`:

```cron
# Every 3 hours, refresh all platforms. Stagger by 5min to avoid hitting MongoDB simultaneously.
0  */3 * * * ec2-user curl -sf -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/meta-sync >> /var/log/flint-campaigns.log 2>&1
5  */3 * * * ec2-user curl -sf -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/google-sync >> /var/log/flint-campaigns.log 2>&1
10 */3 * * * ec2-user curl -sf -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/tiktok-sync >> /var/log/flint-campaigns.log 2>&1
```

Logs: `/var/log/flint-campaigns.log` + `docker logs flint`.

**Manual trigger** (for testing / after token rotation):

```bash
curl -H "x-cron-secret: $CRON_SECRET" https://<tu-dominio-de-flint>/api/cron/meta-sync
```

---

## 8. Observability

No dedicated dashboard yet. Checks:

- **Is the cron firing?** `sudo tail -f /var/log/flint-campaigns.log` on EC2
- **Is the snapshot fresh?** `node scripts/mongo-cli.mjs raw query campaign_snapshots '{}' --sort '{"generatedAt":-1}' --limit 1`
- **Which accounts failed?** The cron response `errors` array lists each client + reason
- **Is the data correct?** Compare a known campaign's spend against the platform UI — numbers should match within 1-2% (platform UIs sometimes include estimated spend that hasn't settled)

Planned: a `/campaigns/health` page showing last sync time per platform + last N sync results + errors.

---

## 9. Known limitations

- **No per-day time series.** The snapshot is month-to-date only. Historical trends require storing multiple snapshots and is a future feature.
- **Alerts don't dedupe.** If an account has been over budget for 5 syncs, you get 5 alerts (one per snapshot, not 5 in the same snapshot — but the alert reappears every sync). The frontend shows only the latest snapshot's alerts, so this is mostly cosmetic.
- **Meta budgets are per-campaign, not per-account.** Meta doesn't expose monthly account-level budgets via the API. `monthlyBudget` comes from `ad_clients` (manually maintained) and represents the client's agreement, not a platform-enforced cap.
- **Google's `reach` is missing for Search/Display.** The UI will show "—" for reach on Google Search campaigns. This is a platform limitation, not a bug.
- **Cross-platform aggregation is shallow.** The top stat cards sum across platforms, but currency is assumed to match (all MXN). If a client ever runs in USD, the sum will silently mix currencies.
