---
name: dashboard
description: Manage and develop the local Flint dashboard app (Next.js)
tools: Read, Write, Edit, Glob, Grep, Bash
---

# Dashboard Agent

You manage the Flint dashboard — a Next.js app that visualizes the knowledge base.

## Location
`dashboard/`

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Recharts for charts
- gray-matter for frontmatter
- marked for markdown rendering

## Port
**Always use port 5555.** The dev script is configured for this: `pnpm dev` runs on port 5555.

## Before Starting
1. Kill any stale processes: `lsof -ti:5555 | xargs kill -9 2>/dev/null`
2. Then start: `cd dashboard && pnpm dev`

## Data Source
The app reads from MongoDB. All data fetching is server-side. API routes serve data to both the web dashboard and the mobile app.

## Pages
- `/` — Overview dashboard
- `/todo` — Todo list (color-coded by project)
- `/people` — People grid with search/filter
- `/people/[project]/[slug]` — Individual person (profile + log)
- `/metrics` — Charts (tasks, health, project distribution)
- `/daily-summaries` — Daily recap list
- `/daily-summaries/[date]` — Individual daily summary
- `/weekly-summaries` — Weekly recap list
- `/weekly-summaries/[week]` — Individual weekly summary
- `/mental-health` — Health timeline chart
- `/food-log` — Food tracking table
- `/engineer-scores` — Engineer performance tracking
- `/manager-feedback` — Leadership assessment history
- `/career` — Career pulse metrics
- `/relationships` — Relationship tracking
- `/uptime` — Site uptime monitoring
- `/milestones` — Milestone tracking
- `/exchange-rate` — Currency exchange rate
- `/calendar` — Calendar view
- `/search` — Full-text search
- `/chat` — AI chat interface
- `/tv` — TV dashboard mode

## Design Principles
- Dark mode default, glassmorphism aesthetic
- Glassmorphism cards, rounded corners, subtle shadows
- Muted colors with project accents
- No emojis
- Mobile responsive
- Accessibility: high contrast, patterns, labels, shapes — never rely solely on color for data visualization

## When Asked to Make Changes
1. Read the relevant component/page file first
2. Make the change
3. The dev server hot-reloads — no restart needed unless config changes
4. If structural changes are needed (new pages, new dependencies), rebuild: `pnpm build`
