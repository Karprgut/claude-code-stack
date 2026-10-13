# Flint

**AI-powered personal knowledge base and life manager.**

Flint is a personal command center that tracks everything you touch in a day — people, projects, metrics, health, and todos — and turns it into actionable intelligence. It replaces spreadsheets, markdown files, and mental load with a single dashboard backed by MongoDB and a Claude-powered CLI agent.

---

## What It Does

### People Management
- **Engineer scoring** — 11 dimensions per engineer per day, with markdown-formatted reasoning explaining every score. Radar charts, trend lines, team heatmap, history with deltas.
- **Director scoring** — 6-dimension evaluation tailored for directors/leads (responsiveness, delegation, strategic thinking, collaboration, execution, leadership).
- **Manager feedback** — daily self-assessment across 8 leadership dimensions (delegation, growth conversations, bias awareness, decision quality, peer dynamics, time management, communication, strategic thinking).
- **People logs** — per-person per-day interaction tracking across projects. Notes, timestamps, sentiment.
- **Bias guardrails** — explicit checks for known biases in people management.

### Operations
- **Todo system** — project-tagged, priority-aware, push-count tracking. Full list rendered after every change.
- **Milestones** — project milestone tracker with per-feature status, owners, target dates.
- **Recurring tasks** — automated task scheduling with configurable frequency.
- **Calendar** — native calendar view with ICS feed sync (Google/Apple/Outlook), per-day agenda with clickable todos, external events tagged by source.
- **Daily summaries** — AI-generated end-of-day recaps saved to MongoDB.
- **Weekly summaries** — Friday rollups of the week's work.

### Marketing & Campaigns
- **Native ad platform APIs** — Meta Marketing API, Google Ads API, TikTok Marketing API (replacing CSV scraping).
- **Multi-account sync** — cron job pulls campaigns, insights, spend, and delivery metrics for every configured account, twice daily.
- **Budget alerts** — automatic warnings at 80%/100% of monthly budget per account.
- **Client health** — per-client dashboard with spend trend, delivery rate, campaign-level detail.

### Wellness
- **Macros & nutrition** — log meals in plain text ("2 eggs and toast"); Nutritionix + Claude fallback auto-estimate calories, protein, carbs, fat, fiber, sugar, sodium.
- **Daily targets** — per-macro goals with progress bars on the Overview and dedicated Wellness page.
- **Mental health** — mood (EOD) and sleep (morning) tracking with correlation charts.
- **Health contribution chart** — GitHub-style heatmap of daily health score (combining sleep, mood, nutrition).

### Personal
- **Wishlist** — personal wishlist with priority and pricing.
- **Metrics** — daily and weekly metric charts showing trends.

### AI & Intelligence
- **Multi-provider chat** — Claude, GPT, and other AI models embedded in the dashboard with tool use (read files, query MongoDB, manage todos).
- **Shared AI memory** — persistent memory across AI sessions and providers. What one AI learns, all others can access.
- **AI cost tracking** — monitor API usage and costs across providers.

---

## Stack

| Component | Technology |
|---|---|
| Web Dashboard | Next.js 15, React 19, Tailwind CSS 4, Recharts, SWR |
| iOS App | Native Swift, SwiftUI |
| Database | MongoDB Atlas |
| AI Agent | Claude Code (Anthropic) |
| Infrastructure | AWS (EC2, ALB, ECR, Terraform) |
| CI/CD | GitHub Actions |

## Architecture

```
┌──────────────┐     ┌──────────────┐
│   iOS App    │     │  Web Dashboard│
│  (Swift)     │     │  (Next.js)   │
└──────┬───────┘     └──────┬───────┘
       │                     │
       └────────┬────────────┘
                │
        ┌───────▼────────┐
        │  API Routes    │
        │  (Next.js)     │
        └───────┬────────┘
                │
        ┌───────▼────────┐
        │  MongoDB Atlas │
        │  (database:    │
        │   flint)       │
        └────────────────┘
```

## Quick Start

```bash
# 1. Run the interactive setup
bash flint-init.sh

# 2. Start the dashboard
cd dashboard && pnpm dev
# → http://localhost:5555

# 3. Start Claude Code
claude --dangerously-skip-permissions
# → Say "let's start the day"
```

For the full step-by-step guide (including MongoDB setup, AWS deployment, and iOS app), see **[SETUP.md](SETUP.md)**.

## Documentation

| Doc | What's in it |
|---|---|
| [SETUP.md](SETUP.md) | Fresh-install guide — MongoDB, AWS, iOS, CI/CD. |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Day-to-day usage — morning routine, todos, people, wellness, end-of-day. |
| [docs/MARKETING_APIS.md](docs/MARKETING_APIS.md) | Getting tokens for Meta, Google Ads, TikTok; env vars; troubleshooting. |
| [docs/META_KABRITA_TOKEN_GUIDE.md](docs/META_KABRITA_TOKEN_GUIDE.md) | Shareable guide (Spanish) for the Kabrita admin to generate a System User token. |
| [docs/APPLE_HEALTH_DEV_SETUP.md](docs/APPLE_HEALTH_DEV_SETUP.md) | Shareable guide (Spanish) for the Apple Dev team owner to enable HealthKit on the App ID. |
| [docs/CAMPAIGNS_TECHNICAL.md](docs/CAMPAIGNS_TECHNICAL.md) | Technical deep-dive — data flow, schemas, GAQL queries, platform mapping. |
| [docs/CLI_REFERENCE.md](docs/CLI_REFERENCE.md) | Every `mongo-cli.mjs` command with examples. |

## Upgrading from v0.0.2

If you're using the file-based Flint Starter Pack, see the migration section in [SETUP.md](SETUP.md#upgrading-from-v002).

## License

Private. Not open source.

Code-tasks pipeline funcionando desde 2026-04-19
