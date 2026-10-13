#!/usr/bin/env node
/**
 * Flint — Nightly Todo Rollover
 *
 * Moves any incomplete "today" todos to tomorrow. Runs every night at 23:55
 * local (America/Mexico_City) via GitHub Actions, so unfinished items always
 * stay in the Today section instead of falling into Invalid Date limbo.
 *
 * Skips:
 *   - todos already completed (completed === true)
 *   - todos with a recurringId (managed by the recurring system)
 *   - todos whose sectionId is a specific future date (only "today" rolls)
 *
 * Usage:
 *   node scripts/rollover-todos.mjs                   # roll today → tomorrow
 *   node scripts/rollover-todos.mjs --date 2026-05-04 # treat this date as "today"
 *   node scripts/rollover-todos.mjs --dry-run         # preview without writes
 */

import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  try {
    const envLocal = readFileSync(resolve(__dirname, "..", ".env.local"), "utf-8");
    const match = envLocal.match(/MONGODB_URI=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  try {
    const secretsPath = resolve(__dirname, "..", "..", ".secrets", "mongodb.env");
    const match = readFileSync(secretsPath, "utf-8").match(/MONGODB_URI=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  try {
    const ec2Env = readFileSync("/data/.env", "utf-8");
    const match = ec2Env.match(/MONGODB_URI=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  throw new Error("MONGODB_URI not found");
}

const TZ = process.env.FLINT_TIMEZONE || "America/Mexico_City";

function todayLocal() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const out = { date: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date") out.date = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const today = args.date || todayLocal();
  const tomorrow = addDays(today, 1);

  const uri = getMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("flint");

  try {
    const todos = db.collection("todos");

    // Candidates: incomplete todos either in the "today" section or pinned to
    // today via date/targetDate. Recurring-managed ones are filtered in JS
    // since we want to count and report them.
    const candidates = await todos
      .find({
        completed: { $ne: true },
        $or: [
          { sectionId: "today" },
          { targetDate: today },
          { date: today },
        ],
      })
      .toArray();

    const toRoll = candidates.filter((t) => !t.recurringId);
    const skippedRecurring = candidates.length - toRoll.length;

    if (args.dryRun) {
      console.log(`[dry run] today=${today} tomorrow=${tomorrow}`);
      console.log(`[dry run] eligible: ${toRoll.length} | skipped (recurring): ${skippedRecurring}`);
      for (const t of toRoll) {
        console.log(`  - ${t._id} [${t.project || "—"}] ${t.text}`);
      }
      return;
    }

    let rolled = 0;
    for (const t of toRoll) {
      const update = { $set: { sectionId: "today", updatedAt: new Date() } };
      if ("targetDate" in t) update.$set.targetDate = tomorrow;
      if ("date" in t) update.$set.date = tomorrow;
      // If neither field was present, still write `date` so future runs anchor on it.
      if (!("date" in t) && !("targetDate" in t)) update.$set.date = tomorrow;

      const res = await todos.updateOne({ _id: t._id }, update);
      if (res.modifiedCount > 0) rolled += 1;
    }

    console.log(
      `✓ rollover complete — today=${today} → tomorrow=${tomorrow} | rolled=${rolled} skipped_recurring=${skippedRecurring}`
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
