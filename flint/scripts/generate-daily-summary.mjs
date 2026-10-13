#!/usr/bin/env node
/**
 * Flint — Daily & Weekly Summary Generator
 *
 * Gathers the day's data from MongoDB (mental_health, food_log, exercise_log,
 * engineer_scores, manager_feedback, todo_archive, ceramics_batches) and
 * upserts a markdown summary into `daily_summaries`. On Sunday (or with
 * --weekly), also writes `weekly_summaries` for the ISO week that just ended.
 *
 * Usage:
 *   node scripts/generate-daily-summary.mjs                      # today
 *   node scripts/generate-daily-summary.mjs --date 2026-04-18    # backfill a day
 *   node scripts/generate-daily-summary.mjs --weekly --week-start 2026-04-14 --week-end 2026-04-20
 *   node scripts/generate-daily-summary.mjs --backfill 2026-04-16..2026-04-20
 *
 * Cron (EC2):
 *   30 23 * * * cd /data/dashboard && /usr/bin/node scripts/generate-daily-summary.mjs >> /var/log/flint-summaries.log 2>&1
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
  // EC2 fallback — Terraform mantiene MONGODB_URI en /data/.env y el cron de
  // user_data.sh no inyecta env vars al ejecutar este script via cron.
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

function dayName(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("es-MX", { weekday: "long", timeZone: TZ });
}

function isoWeekOf(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = (d - firstThursday) / 86400000;
  const week = 1 + Math.round(diff / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function startOfIsoWeek(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dayNum);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const out = { date: null, weekly: false, weekStart: null, weekEnd: null, weekId: null, backfill: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date") out.date = argv[++i];
    else if (a === "--weekly") out.weekly = true;
    else if (a === "--week-start") out.weekStart = argv[++i];
    else if (a === "--week-end") out.weekEnd = argv[++i];
    else if (a === "--week-id") out.weekId = argv[++i];
    else if (a === "--backfill") out.backfill = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function fmtNum(n, digits = 0) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: digits });
}

function projectLabel(code) {
  const map = { ADG: "Adglow", KCL: "Karma Creative Lab", PER: "Personal", CER: "Cerámica", KAB: "Kabrita", TBP: "The Branding People", RUT: "Ruth's Chris", FC: "Flint Core", FVR: "Flint Core", FS: "Flint Starter", MCD: "MCD", WORK: "Work" };
  return map[code] || code;
}

async function gatherDay(db, date) {
  const [mental, foods, exercises, scores, feedback, completions, ceramics] = await Promise.all([
    db.collection("mental_health").findOne({ _id: date }),
    db.collection("food_log").find({ date }).toArray(),
    db.collection("exercise_log").find({ date }).toArray(),
    db.collection("engineer_scores").find({ date }).toArray(),
    db.collection("manager_feedback").findOne({ _id: date }),
    db.collection("todo_archive").find({ completedAt: { $regex: `^${date}` } }).toArray(),
    db.collection("ceramics_batches").find({
      $or: [
        { date },
        { "stateHistory.date": date },
      ],
    }).toArray(),
  ]);
  return { mental, foods, exercises, scores, feedback, completions, ceramics };
}

function summarizeMacros(foods) {
  const sum = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const f of foods) {
    for (const k of Object.keys(sum)) sum[k] += Number(f[k] || 0);
  }
  return sum;
}

function groupCompletionsByProject(completions) {
  const by = {};
  for (const t of completions) {
    const p = t.project || "—";
    (by[p] ||= []).push(t);
  }
  return by;
}

function buildDailyMarkdown(date, data) {
  const { mental, foods, exercises, scores, feedback, completions, ceramics } = data;
  const weekday = dayName(date);
  const lines = [];

  lines.push(`# Daily Summary — ${date} (${weekday.charAt(0).toUpperCase() + weekday.slice(1)})`);
  lines.push("");

  // Wellness
  lines.push("## Wellness");
  if (mental) {
    if (mental.mood || mental.moodScore != null) {
      lines.push(`- **Ánimo:** ${mental.mood || "—"}${mental.moodScore != null ? ` (${mental.moodScore}/10)` : ""}`);
    }
    if (mental.sleepScore != null || mental.sleepNotes) {
      lines.push(`- **Sueño:** ${mental.sleepScore != null ? `${mental.sleepScore}/10` : "—"}${mental.sleepNotes ? ` — ${mental.sleepNotes}` : ""}${mental.sleepAid ? ` (ayuda: ${mental.sleepAid})` : ""}`);
    }
    if (mental.notes) lines.push(`- **Notas:** ${mental.notes}`);
  } else {
    lines.push("- Sin entrada de mental_health para este día.");
  }
  if (exercises.length) {
    lines.push(`- **Ejercicio:** ${exercises.map(e => `${e.activity}${e.notes ? ` (${e.notes})` : ""}`).join("; ")}`);
  }
  lines.push("");

  // Nutrición
  if (foods.length) {
    const macros = summarizeMacros(foods);
    lines.push("## Nutrición");
    lines.push(`- **Macros totales:** ${fmtNum(macros.calories)} kcal · ${fmtNum(macros.protein)}g proteína · ${fmtNum(macros.carbs)}g carbs · ${fmtNum(macros.fat)}g grasa · ${fmtNum(macros.fiber)}g fibra`);
    for (const f of foods) {
      const meal = f.meal || "—";
      lines.push(`- **${meal}:** ${f.what}${f.calories ? ` — ${fmtNum(f.calories)} kcal` : ""}`);
    }
    lines.push("");
  }

  // Productividad
  lines.push("## Productividad");
  if (completions.length) {
    const byProject = groupCompletionsByProject(completions);
    lines.push(`- **Tareas completadas:** ${completions.length}`);
    for (const [code, tasks] of Object.entries(byProject)) {
      lines.push(`  - **${projectLabel(code)} (${code})** — ${tasks.length}`);
      for (const t of tasks.slice(0, 8)) {
        lines.push(`    - ${t.text}`);
      }
      if (tasks.length > 8) lines.push(`    - …y ${tasks.length - 8} más`);
    }
  } else {
    lines.push("- Sin tareas cerradas registradas este día.");
  }
  lines.push("");

  // Cerámica
  if (ceramics.length) {
    lines.push("## Cerámica");
    for (const b of ceramics) {
      const last = b.stateHistory?.[b.stateHistory.length - 1];
      const state = last?.state || b.state;
      lines.push(`- **${b.series || "Batch"}** — ${b.count} piezas, estado: ${state}${b.notes ? ` — ${b.notes}` : ""}`);
    }
    lines.push("");
  }

  // Leadership / scoring
  if (feedback || scores.length) {
    lines.push("## Liderazgo & Equipo");
    if (feedback) {
      lines.push(`- **Self-eval liderazgo:** ${feedback.overall}/10 — top: ${feedback.topStrength || "—"} · growth: ${feedback.biggestGrowthArea || "—"}`);
      if (feedback.actionItem) lines.push(`  - Action item: ${feedback.actionItem}`);
    }
    if (scores.length) {
      lines.push(`- **Engineers calificados:** ${scores.length}`);
      for (const s of scores) {
        lines.push(`  - ${s.engineer} — ${s.overall}/10${s.note ? ` · ${s.note}` : ""}`);
      }
    }
    lines.push("");
  }

  lines.push("## Changelog");
  lines.push(`- ${todayLocal()}: summary generado automáticamente por \`generate-daily-summary.mjs\``);
  lines.push("");

  return lines.join("\n");
}

function buildWeeklyMarkdown(weekId, weekStart, weekEnd, dailyDocs) {
  const lines = [];
  lines.push(`# Weekly Summary — Semana ${weekId} (${weekStart} → ${weekEnd})`);
  lines.push("");

  // Wellness aggregate
  const moods = dailyDocs.map(d => d?._mental?.moodScore).filter(x => x != null);
  const sleeps = dailyDocs.map(d => d?._mental?.sleepScore).filter(x => x != null && x > 0);
  const tasks = dailyDocs.reduce((s, d) => s + (d?._completions?.length || 0), 0);
  const calories = dailyDocs.reduce((s, d) => s + (d?._macros?.calories || 0), 0);
  const protein = dailyDocs.reduce((s, d) => s + (d?._macros?.protein || 0), 0);

  lines.push("## Wellness promedio");
  if (moods.length) lines.push(`- **Ánimo promedio:** ${(moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)}/10 (${moods.length} días)`);
  if (sleeps.length) lines.push(`- **Sueño promedio:** ${(sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1)}/10 (${sleeps.length} días con entrada)`);
  lines.push("");

  lines.push("## Productividad");
  lines.push(`- **Tareas cerradas:** ${tasks}`);
  // Top projects
  const byProject = {};
  for (const d of dailyDocs) {
    for (const t of d?._completions || []) {
      byProject[t.project || "—"] = (byProject[t.project || "—"] || 0) + 1;
    }
  }
  const sorted = Object.entries(byProject).sort((a, b) => b[1] - a[1]);
  for (const [code, n] of sorted) {
    lines.push(`  - **${projectLabel(code)} (${code})** — ${n}`);
  }
  lines.push("");

  if (calories > 0) {
    lines.push("## Nutrición");
    lines.push(`- **Calorías totales:** ${fmtNum(calories)} kcal`);
    lines.push(`- **Proteína total:** ${fmtNum(protein)}g`);
    lines.push("");
  }

  lines.push("## Highlights por día");
  for (const d of dailyDocs) {
    const mood = d?._mental?.mood ? ` · ${d._mental.mood}${d._mental.moodScore != null ? ` (${d._mental.moodScore}/10)` : ""}` : "";
    const n = d?._completions?.length || 0;
    lines.push(`- **${d.date} (${dayName(d.date)}):** ${n} tareas cerradas${mood}`);
  }
  lines.push("");

  lines.push("## Changelog");
  lines.push(`- ${todayLocal()}: weekly generado por \`generate-daily-summary.mjs --weekly\``);
  return lines.join("\n");
}

async function generateDaily(db, date, dryRun) {
  const data = await gatherDay(db, date);
  const content = buildDailyMarkdown(date, data);
  if (dryRun) {
    console.log(`--- ${date} (dry run) ---\n${content}`);
    return { date, content };
  }
  await db.collection("daily_summaries").updateOne(
    { _id: date },
    { $set: { _id: date, date, content, updatedAt: new Date() } },
    { upsert: true }
  );
  console.log(`✓ daily_summaries upserted for ${date} (${content.length} chars)`);
  return { date, content, _data: data };
}

async function generateWeekly(db, weekStart, weekEnd, dryRun, weekIdOverride = null) {
  const weekId = weekIdOverride || isoWeekOf(weekStart);
  const dates = [];
  let cur = weekStart;
  while (cur <= weekEnd) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  const dailyDocs = [];
  for (const date of dates) {
    const data = await gatherDay(db, date);
    dailyDocs.push({
      date,
      _mental: data.mental,
      _completions: data.completions,
      _macros: summarizeMacros(data.foods),
    });
  }
  const content = buildWeeklyMarkdown(weekId, weekStart, weekEnd, dailyDocs);
  if (dryRun) {
    console.log(`--- weekly ${weekId} (dry run) ---\n${content}`);
    return { weekId, content };
  }
  await db.collection("weekly_summaries").updateOne(
    { _id: weekId },
    {
      $set: {
        _id: weekId,
        week: weekId,
        weekStart,
        weekEnd,
        content,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
  console.log(`✓ weekly_summaries upserted for ${weekId} (${weekStart} → ${weekEnd}, ${content.length} chars)`);
  return { weekId, content };
}

async function main() {
  const args = parseArgs(process.argv);
  const uri = getMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("flint");

  try {
    if (args.backfill) {
      const [start, end] = args.backfill.split("..");
      let cur = start;
      while (cur <= end) {
        await generateDaily(db, cur, args.dryRun);
        cur = addDays(cur, 1);
      }
    } else if (args.weekly) {
      if (!args.weekStart || !args.weekEnd) {
        // Default: last completed Mon-Sun week
        const today = todayLocal();
        const monOfThis = startOfIsoWeek(today);
        const monOfLast = addDays(monOfThis, -7);
        const sunOfLast = addDays(monOfLast, 6);
        args.weekStart = args.weekStart || monOfLast;
        args.weekEnd = args.weekEnd || sunOfLast;
      }
      await generateWeekly(db, args.weekStart, args.weekEnd, args.dryRun, args.weekId);
    } else {
      const date = args.date || todayLocal();
      await generateDaily(db, date, args.dryRun);
      // Auto-run weekly on Sunday
      const d = new Date(`${date}T12:00:00Z`);
      if (d.getUTCDay() === 0) {
        const weekStart = addDays(date, -6);
        await generateWeekly(db, weekStart, date, args.dryRun);
      }
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
