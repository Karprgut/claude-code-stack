#!/usr/bin/env node
/**
 * Flint — Weekly Summary Generator
 *
 * Builds a markdown weekly summary (Mon-Sun in America/Mexico_City) from
 * todos completed, mood/sleep scores, food logs, exercise logs, engineer
 * scores, manager feedback and notable events, and upserts the result into
 * the `weekly_summaries` collection.
 *
 * Usage:
 *   node scripts/generate-weekly-summary.mjs                          # previous week
 *   node scripts/generate-weekly-summary.mjs --week-start 2026-04-27  # explicit Monday
 *   node scripts/generate-weekly-summary.mjs --week-start 2026-04-27 --week-end 2026-05-03
 *   node scripts/generate-weekly-summary.mjs --dry-run
 *
 * Document shape (kept compatible with existing API + iOS WeeklySummary):
 *   {
 *     _id: "2026-W18",
 *     week: "2026-W18",
 *     weekLabel: "W18",
 *     startDate: "2026-04-27",
 *     endDate:   "2026-05-03",
 *     date: "2026-05-03",     // sortable end-of-week
 *     content: "<markdown>",
 *     createdAt: <Date>,
 *     updatedAt: <Date>
 *   }
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
  return { full: `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`, label: `W${String(week).padStart(2, "0")}` };
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
  const out = { weekStart: null, weekEnd: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--week-start") out.weekStart = argv[++i];
    else if (a === "--week-end") out.weekEnd = argv[++i];
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

function summarizeMacros(foods) {
  const sum = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const f of foods) {
    for (const k of Object.keys(sum)) sum[k] += Number(f[k] || 0);
  }
  return sum;
}

async function gatherWeek(db, weekStart, weekEnd) {
  const dates = enumerateDates(weekStart, weekEnd);
  const dayAlternation = dates.join("|");

  const [mentalDocs, foods, exercises, scores, feedbackDocs, completions, notes, health] = await Promise.all([
    db.collection("mental_health").find({ _id: { $in: dates } }).toArray(),
    db.collection("food_log").find({ date: { $in: dates } }).toArray(),
    db.collection("exercise_log").find({ date: { $in: dates } }).toArray(),
    db.collection("engineer_scores").find({ date: { $in: dates } }).toArray(),
    db.collection("manager_feedback").find({ _id: { $in: dates } }).toArray(),
    db.collection("todo_archive").find({ completedAt: { $regex: `^(${dayAlternation})` } }).toArray(),
    db.collection("notes").find({ date: { $in: dates } }).toArray().catch(() => []),
    db.collection("apple_health_logs").find({ date: { $in: dates } }).toArray().catch(() => []),
  ]);

  return { dates, mentalDocs, foods, exercises, scores, feedbackDocs, completions, notes, health };
}

function enumerateDates(start, end) {
  const out = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

function shortDayName(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  const name = d.toLocaleDateString("es-MX", { weekday: "short", timeZone: TZ });
  return name.replace(".", "").replace(/^./, (c) => c.toUpperCase());
}

function macrosByDate(foods) {
  const out = {};
  for (const f of foods) {
    const d = f.date;
    if (!d) continue;
    const cur = (out[d] ||= { calories: 0, protein: 0, carbs: 0, fat: 0 });
    cur.calories += Number(f.calories || 0);
    cur.protein += Number(f.protein || 0);
    cur.carbs += Number(f.carbs || 0);
    cur.fat += Number(f.fat || 0);
  }
  return out;
}

function tcell(v, digits = 0) {
  if (v == null || Number.isNaN(v) || v === 0) return "—";
  return Number(v).toLocaleString("en-US", { maximumFractionDigits: digits });
}

function buildHealthMacrosTable(dates, health, foods) {
  const healthByDate = Object.fromEntries(health.map((h) => [h.date, h]));
  const macros = macrosByDate(foods);

  const header = "| Día | Pasos | Sueño (h) | FC prom | Peso | Calorías | Proteína | Carbos | Grasa |";
  const sep = "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |";
  const rows = dates.map((d) => {
    const h = healthByDate[d] || {};
    const m = macros[d] || {};
    const label = `${shortDayName(d)} ${d.slice(5)}`;
    return `| ${label} | ${tcell(h.steps)} | ${tcell(h.sleepHours, 1)} | ${tcell(h.heartRateAvg)} | ${tcell(h.weight, 1)} | ${tcell(m.calories)} | ${tcell(m.protein)}g | ${tcell(m.carbs)}g | ${tcell(m.fat)}g |`;
  });

  const hasAny = dates.some((d) => healthByDate[d] || macros[d]);
  if (!hasAny) return null;
  return [header, sep, ...rows].join("\n");
}

function buildMarkdown({ weekLabel, weekFull, startDate, endDate, data }) {
  const { dates, mentalDocs, foods, exercises, scores, feedbackDocs, completions, notes, health } = data;
  const lines = [];

  lines.push(`# Weekly Summary — ${weekFull} (${startDate} → ${endDate})`);
  lines.push("");

  // Wellness
  const moods = mentalDocs.map(m => m.moodScore).filter(x => x != null);
  const sleeps = mentalDocs.map(m => m.sleepScore).filter(x => x != null && x > 0);
  lines.push("## Wellness promedio");
  if (moods.length) {
    const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
    lines.push(`- **Ánimo promedio:** ${avg.toFixed(1)}/10 (${moods.length} días con entrada)`);
  } else {
    lines.push("- **Ánimo promedio:** sin entradas");
  }
  if (sleeps.length) {
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
    lines.push(`- **Sueño promedio:** ${avg.toFixed(1)}/10 (${sleeps.length} días con entrada)`);
  } else {
    lines.push("- **Sueño promedio:** sin entradas");
  }
  if (exercises.length) {
    lines.push(`- **Sesiones de ejercicio:** ${exercises.length}`);
  }
  lines.push("");

  // Salud y Macros — tabla comparativa por día
  const healthTable = buildHealthMacrosTable(dates, health || [], foods);
  if (healthTable) {
    lines.push("## Salud y Macros por día");
    lines.push("");
    lines.push(healthTable);
    lines.push("");
  }

  // Productividad
  const byProject = {};
  for (const t of completions) {
    const p = t.project || "—";
    (byProject[p] ||= []).push(t);
  }
  lines.push("## Productividad");
  lines.push(`- **Tareas cerradas:** ${completions.length}`);
  const sorted = Object.entries(byProject).sort((a, b) => b[1].length - a[1].length);
  for (const [code, tasks] of sorted) {
    lines.push(`  - **${projectLabel(code)} (${code})** — ${tasks.length}`);
  }
  lines.push("");

  // Nutrición
  if (foods.length) {
    const macros = summarizeMacros(foods);
    lines.push("## Nutrición");
    lines.push(`- **Calorías totales:** ${fmtNum(macros.calories)} kcal`);
    lines.push(`- **Proteína total:** ${fmtNum(macros.protein)}g`);
    lines.push(`- **Carbs totales:** ${fmtNum(macros.carbs)}g`);
    lines.push(`- **Grasa total:** ${fmtNum(macros.fat)}g`);
    lines.push(`- **Fibra total:** ${fmtNum(macros.fiber)}g`);
    lines.push("");
  }

  // Liderazgo & Equipo
  if (scores.length || feedbackDocs.length) {
    lines.push("## Liderazgo & Equipo");
    if (feedbackDocs.length) {
      const avgLeadership = feedbackDocs.map(f => f.overall).filter(x => x != null);
      if (avgLeadership.length) {
        const avg = avgLeadership.reduce((a, b) => a + b, 0) / avgLeadership.length;
        lines.push(`- **Self-eval liderazgo promedio:** ${avg.toFixed(1)}/10 (${avgLeadership.length} días)`);
      }
    }
    if (scores.length) {
      const byEngineer = {};
      for (const s of scores) {
        if (s.overall == null) continue;
        (byEngineer[s.engineer] ||= []).push(s.overall);
      }
      const ranking = Object.entries(byEngineer)
        .map(([engineer, vals]) => ({ engineer, avg: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length }))
        .sort((a, b) => b.avg - a.avg);
      if (ranking.length) {
        lines.push(`- **Engineers calificados:** ${ranking.length}`);
        for (const r of ranking) {
          lines.push(`  - ${r.engineer} — ${r.avg.toFixed(1)}/10 (${r.n} día${r.n === 1 ? "" : "s"})`);
        }
      }
    }
    lines.push("");
  }

  // Notas / eventos
  if (notes.length) {
    lines.push("## Notas / eventos");
    for (const n of notes) {
      const head = n.title || n.name || n.date || "Nota";
      const body = n.content ? ` — ${n.content.slice(0, 160)}${n.content.length > 160 ? "…" : ""}` : "";
      lines.push(`- **${head}**${body}`);
    }
    lines.push("");
  }

  // Highlights por día
  lines.push("## Highlights por día");
  const completionsByDate = {};
  for (const t of completions) {
    const d = (t.completedAt || "").slice(0, 10);
    completionsByDate[d] = (completionsByDate[d] || 0) + 1;
  }
  const mentalByDate = Object.fromEntries(mentalDocs.map(m => [m._id, m]));
  for (const date of dates) {
    const m = mentalByDate[date];
    const moodTxt = m && (m.mood || m.moodScore != null) ? ` · ${m.mood || "—"}${m.moodScore != null ? ` (${m.moodScore}/10)` : ""}` : "";
    const n = completionsByDate[date] || 0;
    lines.push(`- **${date} (${dayName(date)}):** ${n} tareas cerradas${moodTxt}`);
  }
  lines.push("");

  lines.push("## Changelog");
  lines.push(`- ${todayLocal()}: weekly generado por \`generate-weekly-summary.mjs\``);

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);

  let weekStart = args.weekStart;
  let weekEnd = args.weekEnd;
  if (!weekStart) {
    const monOfThis = startOfIsoWeek(todayLocal());
    weekStart = addDays(monOfThis, -7);
  }
  if (!weekEnd) {
    weekEnd = addDays(weekStart, 6);
  }

  const { full: weekFull, label: weekLabel } = isoWeekOf(weekStart);

  const uri = getMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("flint");

  try {
    const data = await gatherWeek(db, weekStart, weekEnd);
    const content = buildMarkdown({ weekLabel, weekFull, startDate: weekStart, endDate: weekEnd, data });

    if (args.dryRun) {
      console.log(`--- ${weekFull} (dry run) ---\n${content}`);
      return;
    }

    const now = new Date();
    await db.collection("weekly_summaries").updateOne(
      { _id: weekFull },
      {
        $set: {
          _id: weekFull,
          week: weekFull,
          weekLabel,
          startDate: weekStart,
          endDate: weekEnd,
          date: weekEnd,
          content,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    console.log(`✓ weekly_summaries upserted for ${weekFull} (${weekStart} → ${weekEnd}, ${content.length} chars)`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
