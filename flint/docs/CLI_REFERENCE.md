# CLI Reference — `mongo-cli.mjs`

Flint's MongoDB CLI. Used by Claude Code during conversations to read/write all Flint data. Anything the dashboard does, this can do too.

**Run from the dashboard directory:**

```bash
cd dashboard
node scripts/mongo-cli.mjs <command> [args...]
```

JSON arguments must be valid JSON, wrapped in **single quotes** so the shell doesn't mangle them.

---

## Todos

```bash
# List all active todos grouped by section
node scripts/mongo-cli.mjs todos list

# Add a todo
node scripts/mongo-cli.mjs todos add '{
  "text": "Review PR #123",
  "project": "KAB",
  "section": "today",
  "priority": "critical"
}'

# Complete a todo (archives to todo_archive with completedAt timestamp)
node scripts/mongo-cli.mjs todos complete <id>
node scripts/mongo-cli.mjs todos complete <id> "notes about completion"

# Move a todo to another section
node scripts/mongo-cli.mjs todos move <id> short-term

# Delete a todo (no archive)
node scripts/mongo-cli.mjs todos delete <id>

# Section management
node scripts/mongo-cli.mjs todos section-add '{"_id":"backlog","title":"Backlog","order":4}'
node scripts/mongo-cli.mjs todos section-update <id> '{"title":"New Title"}'
```

**Priority values:** `critical`, `first-thing`, `normal` (default).

**Common sections:** `today`, `short-term`, `medium-term`, `long-term`.

**Always use `todos complete`** — it archives correctly with the right timestamp and timezone. Never manually set `done: true`.

---

## Archive

```bash
# List completed todos (defaults to today)
node scripts/mongo-cli.mjs archive list
node scripts/mongo-cli.mjs archive list --date 2026-04-17
node scripts/mongo-cli.mjs archive list --project KAB
node scripts/mongo-cli.mjs archive list --limit 50

# Full-text search across the archive
node scripts/mongo-cli.mjs archive search "budget review"
```

---

## Engineer scores

One document **per engineer per day** in `engineer_scores`. Schema:

```json
{
  "date": "2026-04-17",
  "engineer": "diego",
  "project": "ADG",
  "scores": {
    "collaboration": 7,
    "coachability": 6,
    "proactivity": 5,
    ...
  },
  "determination": "### **Collaboration (7/10)**\n- ..."
}
```

The `determination` field is markdown — rendered via `react-markdown` on the dashboard. Use `###` headers and `**bold**` dimension names with scores in parens.

```bash
node scripts/mongo-cli.mjs scores add '{"engineer":"diego","date":"2026-04-17","scores":{...},"determination":"### ..."}'
node scripts/mongo-cli.mjs scores get diego
node scripts/mongo-cli.mjs scores get diego --date 2026-04-17
```

---

## Pulse (mental health, manager feedback, daily metrics)

`pulse` is a generic read/write interface for any single-doc-per-day collection.

```bash
# Daily metrics (health score, project task counts)
node scripts/mongo-cli.mjs pulse add daily_metrics '{
  "date": "2026-04-17",
  "health": {"score": 75, "sleep": 8, "mood": 7},
  "projects": {"kab": {"tasks_completed": 3}}
}'

# Mental health (mood EOD, sleep morning)
node scripts/mongo-cli.mjs mental-health add '{
  "date": "2026-04-17",
  "mood": "good",
  "moodScore": 7,
  "sleepScore": 8,
  "sleepNotes": "fell asleep quickly, woke up rested",
  "sleepAid": "none"
}'

# Manager feedback (EOD leadership self-assessment)
node scripts/mongo-cli.mjs feedback add '{
  "date": "2026-04-17",
  "scores": {"delegation": 7, "growth_conversations": 6, ...},
  "determination": "### **Delegation (7/10)** ..."
}'

# Read back
node scripts/mongo-cli.mjs pulse get mental_health
node scripts/mongo-cli.mjs pulse get mental_health --date 2026-04-17
```

---

## Wishlist

```bash
node scripts/mongo-cli.mjs wishlist list
node scripts/mongo-cli.mjs wishlist add '{"name":"New monitor","priority":"medium","price":450}'
node scripts/mongo-cli.mjs wishlist update <id> '{"priority":"high"}'
```

---

## Milestones

Milestones live in a single `milestones` doc per project. Update by passing the full updated object:

```bash
node scripts/mongo-cli.mjs milestones get
node scripts/mongo-cli.mjs milestones update '{
  "project": "KAB",
  "items": [
    {"name": "Launch dashboard", "status": "done", "target": "2026-04-10"},
    {"name": "Macros feature", "status": "in_progress", "target": "2026-04-20"}
  ]
}'
```

---

## AI Memory

Cross-AI shared memory — anything Claude Code learns, the dashboard's chat AI can access.

```bash
# Add (or update if name exists)
node scripts/mongo-cli.mjs memory add '{
  "name": "user_prefers_pnpm",
  "type": "feedback",
  "content": "Use pnpm, never npm or yarn.",
  "tags": ["tooling"],
  "source": "claude-code"
}'

# Types: user | feedback | project | reference | context

# List (optionally filter)
node scripts/mongo-cli.mjs memory list
node scripts/mongo-cli.mjs memory list feedback
node scripts/mongo-cli.mjs memory list user

# Get / search / update / delete
node scripts/mongo-cli.mjs memory get user_prefers_pnpm
node scripts/mongo-cli.mjs memory search "deployment"
node scripts/mongo-cli.mjs memory update user_prefers_pnpm '{"content":"updated..."}'
node scripts/mongo-cli.mjs memory delete user_prefers_pnpm
```

**Every conversation must write at least one memory.** Save corrections, decisions, new info about people/projects, daily context. This is how Flint gets smarter.

---

## Recurring tasks

Tasks that auto-generate todos on a schedule.

```bash
# Add
node scripts/mongo-cli.mjs recurring add '{
  "title": "Weekly 1:1 with Diego",
  "project": "ADG",
  "frequency": "weekly",
  "dayOfWeek": 2,
  "section": "today",
  "nextDue": "2026-04-22"
}'

# Frequency values: daily | weekly | biweekly | monthly
# dayOfWeek (weekly/biweekly): 0=Sunday, 1=Monday, ..., 6=Saturday
# dayOfMonth (monthly): 1-31

# List
node scripts/mongo-cli.mjs recurring list

# List only tasks due today or overdue
node scripts/mongo-cli.mjs recurring due

# Trigger one task — creates the todo, advances nextDue to next occurrence
node scripts/mongo-cli.mjs recurring trigger <id>

# Pause / resume / delete
node scripts/mongo-cli.mjs recurring pause <id>
node scripts/mongo-cli.mjs recurring resume <id>
node scripts/mongo-cli.mjs recurring delete <id>
```

The morning checklist calls `recurring due` and triggers each result automatically.

---

## Raw queries

When the typed commands don't cover what you need:

```bash
# Query any collection with a JSON filter
node scripts/mongo-cli.mjs raw query people '{"project":"ADG"}'
node scripts/mongo-cli.mjs raw query people_logs '{"personId":"ADG:diego","date":"2026-04-17"}'
node scripts/mongo-cli.mjs raw query campaign_snapshots '{}' --sort '{"generatedAt":-1}' --limit 1

# Insert a raw document
node scripts/mongo-cli.mjs raw insert notes '{"project":"ADG","name":"process-gap","content":"..."}'

# Update
node scripts/mongo-cli.mjs raw update people '{"_id":"ADG:diego"}' '{"$set":{"favorite":true}}'
```

**When to use raw:** migrations, one-off debugging, new collections that don't have a typed command yet. For anything routine, use the typed commands so the right shape and timestamps are applied.

---

## Common recipes

### Find all logs for someone regardless of project

```bash
node scripts/mongo-cli.mjs raw query people_logs '{"personId":{"$regex":":diego$"}}'
```

### Count todos completed today

```bash
node scripts/mongo-cli.mjs archive list --date "$(date +%F)" | grep -c '^'
```

### Inspect the latest campaign snapshot

```bash
node scripts/mongo-cli.mjs raw query campaign_snapshots '{}' --sort '{"generatedAt":-1}' --limit 1
```

### Flip a misnamed people_log entry

```bash
# Example: moved from FC: to KCL: (Ricardo went from eng to client)
node scripts/mongo-cli.mjs raw update people_logs \
  '{"personId":"FC:ricardo-viramontes"}' \
  '{"$set":{"personId":"KCL:ricardo-viramontes"}}'
```

---

## Schema reference

For exact field shapes and types per collection, see `dashboard/schemas/collections.md`. **Always read that before inserting into a collection you haven't touched before** — NoSQL tolerates wrong shapes silently, which is how Flint ends up with invisible data.
