# Campaigns — Ad platform data ingestion

Extracts campaign spend, delivery, and insights from Meta, TikTok, and Google Ads.

**Two paths:**

1. **Native APIs (preferred)** — Meta Marketing API, Google Ads API, TikTok Marketing API. Runs on EC2 via cron jobs in the dashboard.
2. **Playwright scraping (fallback)** — Chromium with persisted session. Used for platforms where the native API isn't yet available.

**See [docs/MARKETING_APIS.md](../../docs/MARKETING_APIS.md) for token setup and env vars.**

---

## Current status

| Platform | Native API | Scraper fallback |
|---|---|---|
| **Meta** | ✅ Production — KAB / RTH / TBP | Retired |
| **Google Ads** | 🚧 In progress — Dev Token obtained, OAuth2 pending | Active (CSV import) |
| **TikTok** | ❌ Blocked — app stuck in "Pending Review" | Active (CSV import) |

Runs via cron on the EC2 host — see `/etc/cron.d/flint-*`. The CSV fallback is used temporarily while the native APIs are finalized; uploads go to `_downloads/<client>/`.

---

## How the native path works

1. **Cron** hits `/api/cron/meta-sync` (and peers) with `x-cron-secret` header
2. The endpoint calls `syncAllMeta()` in `dashboard/lib/meta-api.ts`, which iterates the `CLIENTS` config and reads the platform API
3. Results are merged with the previous snapshot (one platform at a time — Meta doesn't overwrite Google's data)
4. Snapshot is written to `campaign_snapshots` in MongoDB
5. Budget alerts computed on every sync (80% warn, 100% high)
6. The `/campaigns` page on the dashboard renders whatever's in the latest snapshot

---

## How the scraper path works (legacy)

1. **Setup (once per platform):** open a Chromium controlled by Playwright, log in manually with 2FA, session is persisted to `sessions/{platform}/`
2. **Scrape:** Playwright scripts reuse the session and scrape the dashboard UI
3. **Consolidate:** `run.ts` aggregates snapshots, evaluates alerts, writes `data/consolidated.json`
4. Uploaded to MongoDB via the same `campaign_snapshots` path

### Setup

```bash
cd ops/campaigns
pnpm install
npx playwright install chromium
cp .env.example .env
# Edit .env
pnpm setup:meta   # or tiktok, google-ads
```

### Manual run

```bash
pnpm run:meta
pnpm run        # all configured scrapers
```

### Scheduling

On EC2 this runs via `/etc/cron.d/flint-campaigns`. For local dev on macOS use launchd — see the LaunchAgent plist below.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.flint.campaigns</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd /path/to/ops/campaigns && /usr/local/bin/pnpm run</string>
  </array>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict>
  </array>
  <key>StandardOutPath</key>
  <string>/path/to/ops/campaigns/logs/launchd.log</string>
  <key>StandardErrorPath</key>
  <string>/path/to/ops/campaigns/logs/launchd.err</string>
</dict>
</plist>
```

Load: `launchctl load ~/Library/LaunchAgents/com.flint.campaigns.plist`

---

## Structure

```
ops/campaigns/
├── setup.ts              # interactive login (scraper, 1x per platform)
├── run.ts                # scraper orchestrator
├── scrapers/
│   └── meta.ts           # legacy Meta scraper (deprecated)
├── sessions/             # cookies/storage (gitignored)
├── data/                 # snapshots JSON (gitignored)
├── logs/                 # scraper logs (gitignored)
├── _downloads/           # client CSV drops (Google/TikTok fallback)
│   ├── kab/
│   ├── rth/
│   └── tbp/
└── .env                  # credentials / config (gitignored)
```

---

## Gotchas

### Native path
- **Meta tokens expire every ~60 days.** Cron starts failing with `Error validating access token`. Regenerate via Graph API Explorer, extend to 60d, update SSM.
- **Docker restart doesn't reload `.env`.** After rotating a token, you must `docker stop flint && docker rm flint && docker run ...` — a plain `docker restart` keeps the old env.
- **Google Developer Token starts in Test mode.** You must apply for Basic Access to hit production accounts.
- **TikTok apps can stay Pending forever.** If it's been more than 2 weeks, use Sandbox Mode instead of waiting.

### Scraper path (legacy)
- **Rate limiting:** 2x/day is conservative. Don't increase frequency.
- **Brittle selectors:** Meta/TikTok DOM changes every few weeks. If a scraper fails, run with `HEADLESS=false` to see what moved.
- **Session expiry:** Meta logs you out after ~30–90 days. When that happens: `pnpm setup:<platform>` again.
- **Anti-bot detection:** Low risk with 2 runs/day, but if detected, add random delays in the scraper and consider rotating user-agent.

---

## Adding a new platform

Preferred: native API via `dashboard/lib/<platform>-api.ts` + `dashboard/app/api/cron/<platform>-sync/route.ts`. Pattern from `meta-api.ts`.

Fallback: Playwright scraper. Copy `scrapers/meta.ts` as a template:

1. Change login URL and dashboard URL
2. Adapt the DOM selectors
3. Add to the `SCRAPERS` array in `run.ts`
4. Add to the `setup.ts` switch
