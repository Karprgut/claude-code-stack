# Flint — User Guide

Day-to-day usage of Flint. For initial setup see [SETUP.md](../SETUP.md).

---

## The two surfaces

Everything Flint does lives in **one of two places**:

| Surface | Purpose |
|---|---|
| **Web dashboard** (https://<tu-dominio-de-flint> or http://localhost:5555) | Visual layer — charts, lists, trends. Read-heavy. |
| **Claude Code CLI** (`claude --dangerously-skip-permissions` from the repo root) | Action layer — write-heavy. Logs people, adds todos, scores engineers, generates summaries. |

Both talk to the same MongoDB. Anything you do in one appears immediately in the other. The iOS app is a third surface that mirrors the web dashboard.

---

## Morning routine

Open Claude Code and say:

```
let's start the day
```

Flint will:

1. Pull latest git
2. Read yesterday's daily summary
3. Run **Dev Sentiment Check** — summarize the last few days of people logs for everyone on `managed_people`
4. Check **recurring tasks** due today and create todos for each
5. Ask: **"How did you sleep?"** → logs `sleepScore`, `sleepNotes`, `sleepAid` to `mental_health`
6. Review **milestones** — does today's work change any statuses?
7. Show the full todo list grouped by project

Weekends are lighter — no dev sentiment, no engineer scoring, just the recurring tasks and "how did you sleep / any plans today?".

---

## During the day

### Todos

Just say what you need to do. Flint tags it with the right project code.

```
- "Add todo: review PR #123 for KAB"
- "Add: call Ruths about April invoice — critical"
- "Mark the PR review as done"
- "Push the invoice call to short term"
- "What's left for KAB today?"
```

Every change returns the **full updated list**, grouped by project, with priority items pinned to the top. Items pushed 3+ times get flagged.

### People logs

Tell Flint what happened with someone — it writes to `people_logs` with today's date and a timestamp.

```
- "Note on Diego: he's blocked on the Meta API integration, needs my help tomorrow"
- "Update on Ruths: approved the April budget, she's happy with delivery"
- "Quick log: Pablo crushed the dashboard redesign, finished 2 days early"
```

**Screenshots work too.** Paste a screenshot of a Slack/WhatsApp/Teams conversation and Flint will log entries for every person mentioned and extract any action items as todos.

If it's not clear who said what, Flint will ask before logging.

### Wellness — food & macros

Just say what you ate. Flint looks up macros automatically (Nutritionix + Claude fallback).

```
- "I had eggs and toast for breakfast"
- "Lunch: chicken bowl with rice and avocado"
- "Dinner: 2 tacos al pastor"
```

Daily targets (defaults: 1500 kcal, 100g protein, 150g carbs, 50g fat, 25g fiber) are shown as progress bars on the Overview and at `/wellness`. Bars turn:
- **Gray** < 40%
- **Yellow** 40–80%
- **Green** 80–100%
- **Orange** > 100%

### Calendar

The `/calendar` page shows a month grid with meetings, external events (from ICS feeds), and todo completions. Click any day to see an agenda panel with:

- External events (color-coded by feed source)
- Todos due/completed that day — **click the checkbox to toggle**
- Daily metrics if the day has any

ICS feeds come from env vars (`ICS_LADON_URL`, `ICS_KCL_URL`, `ICS_PERSONAL_URL`). The `meta-sync`-style cron refreshes them every 30 minutes.

### Marketing campaigns

The `/campaigns` page shows spend, delivery, and budget status for every configured ad account across Meta, Google Ads, and TikTok. Data is pulled by the cron job at `/api/cron/meta-sync` (Meta), `/api/cron/google-sync` (Google), etc.

See [MARKETING_APIS.md](MARKETING_APIS.md) for how to add or rotate tokens.

---

## End-of-day routine

Say:

```
let's wrap up
```

Flint runs the full closeout:

1. **"How are you feeling?"** — logs `mood` + `moodScore` (1–10) to `mental_health`
2. **"Any notes on your team today?"** — writes `people_logs` for each person mentioned
3. **Engineer scores** — 11 dimensions per engineer, each with a markdown `determination` field explaining the score. Skipped on weekends.
4. **Manager feedback** — daily self-assessment across 8 leadership dimensions
5. **Milestones update** — reviews and updates milestone statuses
6. **Daily metrics** — saves `health.score`, project task counts to `daily_metrics`
7. **Daily summary** — prose recap saved to `daily_summaries`
8. **Friday only**: weekly summary → `weekly_summaries`
9. **Git commit + push**

---

## Key dashboard pages

| Page | What to check |
|---|---|
| `/` (Overview) | Today's focus, upcoming events, macros progress, health contribution heatmap |
| `/todo` | Full board with sections (today / short / medium / long term). Archive for completed items. |
| `/people` | Directory of everyone you've logged. Click a card → per-person timeline. |
| `/teams` | Team-level views (org structure, per-team notes). |
| `/calendar` | Month grid with meetings, todos, external events. |
| `/milestones` | Per-project milestones with status, owner, target date. |
| `/metrics` | Daily/weekly metric charts. |
| `/mental-health` | Mood + sleep trend lines, correlation charts. |
| `/wellness` | Food log with macro totals, daily targets, history. |
| `/engineer-scores` | 11-dimension radar, trend lines, team heatmap. |
| `/director-scores` | 6-dimension scoring for directors/leads (ADG-managed). |
| `/manager-feedback` | Your own leadership scores over time. |
| `/campaigns` | Ad platform spend, delivery, budget alerts. |
| `/daily-summaries` | Archive of EOD summaries. |
| `/weekly-summaries` | Friday rollups. |
| `/chat` | Multi-provider AI chat with tool use. |
| `/ai-memory` | Browse the shared memory corpus. |
| `/wishlist` | Personal wishlist with priority + price. |
| `/tv` | Ambient view for a dedicated monitor. |

---

## Core rules Flint follows

These are baked into `CLAUDE.md` — Flint applies them without being asked:

- **Full todo list after every change.** No summaries that skip items.
- **Date awareness.** Runs `date` at the start of every session — never assumes what day it is.
- **Weekend mode.** Saturdays and Sundays skip dev sentiment and engineer scoring.
- **Honest scoring.** 5 is developing, 7 is solid, 9+ needs clear evidence. Zero signal = sub-4.
- **Casing convention.** People IDs are `PROJECT:slug` with **uppercase** project code (`ADG:diego`, not `adg:diego`).
- **Schema matching.** Before any MongoDB insert, Flint checks `dashboard/schemas/collections.md` or queries a recent doc for the exact shape.

---

## When things go wrong

### Todos don't show up
Check you're on the right section and project filter. If still missing, query `todos` directly:

```bash
cd dashboard && node scripts/mongo-cli.mjs todos list
```

### People notes went to the wrong person
The most common bug is casing (`adg:` vs `ADG:`). Check `people_logs`:

```bash
node scripts/mongo-cli.mjs raw query people_logs '{"personId":"ADG:diego"}'
```

If entries are under the lowercase key, run a migration update to flip them.

### Dashboard shows stale data
All pages are `force-dynamic`, so data reloads on every request. If something looks cached, hard-refresh (⌘-Shift-R). If it's still wrong, the docs in MongoDB are probably wrong — query directly.

### Cron not running (prod)
Cron lives on the EC2 box in `/etc/cron.d/flint-*`. SSH in (or SSM), check `systemctl status crond`, and tail the logs:

```bash
sudo tail -f /var/log/cron
```

### iOS app shows stale data
The app caches aggressively. Swipe down to refresh. If the API URL changed, rebuild with Xcode.

---

## Reference data in MongoDB

Your personal setup lives in `system_config`:

```bash
# Your profile
node scripts/mongo-cli.mjs raw query system_config '{"_id":"user_profile"}'

# Project codes + colors
node scripts/mongo-cli.mjs raw query system_config '{"_id":"projects"}'

# Feature flags
node scripts/mongo-cli.mjs raw query system_config '{"_id":"features"}'

# Who you're managing
node scripts/mongo-cli.mjs raw query system_config '{"_id":"managed_people"}'
```

Update any of these and restart the dashboard — changes take effect immediately.
