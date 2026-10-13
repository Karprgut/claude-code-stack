#!/usr/bin/env node
/**
 * Flint MongoDB CLI
 * Used by Claude (Flint) to manage data during conversations.
 * Run: cd dashboard && node scripts/mongo-cli.mjs <command> [args...]
 *
 * Commands:
 *   todos list                          — List all todos grouped by section
 *   todos add <json>                    — Add a todo item
 *   todos complete <id> [notes]         — Complete a todo item
 *   todos move <id> <sectionId>         — Move a todo to a different section
 *   todos delete <id>                   — Delete a todo item
 *   todos section-add <json>            — Add a new section
 *   todos section-update <id> <json>    — Update section metadata
 *
 *   archive list [--date YYYY-MM-DD] [--project XX] [--limit N]
 *   archive search <text>
 *
 *   scores add <json>                   — Add engineer score entry
 *   scores get <engineer> [--date D]    — Get scores for engineer
 *
 *   pulse add <collection> <json>       — Add entry to mental_health, etc.
 *   pulse get <collection> [--date D]   — Get entries from collection
 *
 *   feedback add <json>                 — Add manager feedback entry
 *   mental-health add <json>            — Add mental health entry
 *
 *   wishlist list                       — List wishlist items
 *   wishlist add <json>                 — Add wishlist item
 *   wishlist update <id> <json>         — Update wishlist item
 *
 *   milestones get                      — Get milestones data
 *   milestones update <json>            — Update milestones data
 *
 *   memory add <json>                    — Add/update AI memory (name, content, type, tags)
 *   memory list [type]                   — List all memories (optional type filter)
 *   memory get <name>                    — Get a specific memory by name
 *   memory search <text>                 — Search memories by name/content/tags
 *   memory update <name> <json>          — Update a memory's content/type/tags
 *   memory delete <name>                 — Delete a memory
 *
 *   recurring list                       — List all active recurring tasks
 *   recurring add <json>                 — Add a new recurring task
 *   recurring trigger <id>               — Trigger a task: create todo, advance nextDue
 *   recurring due                        — List tasks where nextDue <= today
 *   recurring pause <id>                 — Pause a recurring task
 *   recurring resume <id>                — Resume a paused recurring task
 *   recurring delete <id>                — Delete a recurring task
 *
 *   raw query <collection> <filter>     — Raw query (for debugging)
 *   raw insert <collection> <doc>       — Raw insert
 *   raw update <collection> <filter> <update>
 */

import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "..");
const SECRETS_PATH = resolve(DATA_DIR, ".secrets", "mongodb.env");

// ── Connection ───────────────────────────────────────────────────────
function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  // Try .env.local in the dashboard directory
  try {
    const envLocal = readFileSync(resolve(__dirname, "..", ".env.local"), "utf-8");
    const match = envLocal.match(/MONGODB_URI=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  // Try legacy secrets path
  try {
    const envContent = readFileSync(SECRETS_PATH, "utf-8");
    const match = envContent.match(/MONGODB_URI=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  throw new Error("No MONGODB_URI found");
}

let client;
let db;

async function connect() {
  client = new MongoClient(getMongoUri());
  await client.connect();
  db = client.db("flint");
}

async function disconnect() {
  if (client) await client.close();
}

// ── Helpers ──────────────────────────────────────────────────────────
function parseJsonArg(arg) {
  try {
    // Strip shell escape artifacts (e.g. \! from bash history expansion)
    const cleaned = arg.replace(/\\([!#$&*?`])/g, "$1");
    return JSON.parse(cleaned);
  } catch {
    console.error("Invalid JSON:", arg);
    process.exit(1);
  }
}

function generateId() {
  const epoch = Date.now();
  const seq = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `t_${epoch}_${seq}`;
}

const TZ = "America/Mexico_City";

function nowCST() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: TZ });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ,
  });
  return `${dateStr} ${timeStr} CST`;
}

function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

// ── Todo Commands ────────────────────────────────────────────────────
async function todosList() {
  const sections = await db.collection("todo_sections").find().sort({ order: 1 }).toArray();
  const todos = await db.collection("todos").find().toArray();

  const todosBySection = {};
  for (const t of todos) {
    if (!todosBySection[t.sectionId]) todosBySection[t.sectionId] = [];
    todosBySection[t.sectionId].push(t);
  }

  const result = sections.map((s) => ({
    id: s._id,
    title: s.title,
    date: s.date,
    items: todosBySection[s._id] || [],
  }));

  console.log(JSON.stringify(result, null, 2));
}

async function todosAdd(jsonStr) {
  const data = parseJsonArg(jsonStr);
  const id = data.id || generateId();
  const sectionId = data.sectionId || data.date || todayStr();

  // Ensure section exists
  const section = await db.collection("todo_sections").findOne({ _id: sectionId });
  if (!section) {
    const sectionCount = await db.collection("todo_sections").countDocuments();
    await db.collection("todo_sections").insertOne({
      _id: sectionId,
      title: data.sectionTitle || sectionId,
      date: data.sectionDate || data.date || null,
      order: sectionCount,
    });
  }

  const doc = {
    _id: id,
    sectionId,
    text: data.text,
    project: (data.project || "PER").toUpperCase(),
    date: data.date || todayStr(),
    priority: data.priority || null,
    pushCount: data.pushCount || 0,
    time: data.time || null,
    timeEnd: data.timeEnd || null,
    source: data.source || null,
    notes: data.notes || null,
  };

  await db.collection("todos").insertOne(doc);
  console.log(JSON.stringify({ ok: true, id, ...doc }));
}

async function todosComplete(id, notes) {
  const todo = await db.collection("todos").findOne({ _id: id });
  if (!todo) {
    console.log(JSON.stringify({ ok: false, error: `Todo ${id} not found` }));
    return;
  }

  // Remove from todos
  await db.collection("todos").deleteOne({ _id: id });

  // Add to archive
  await db.collection("todo_archive").insertOne({
    _id: id,
    text: todo.text,
    project: todo.project,
    date: todo.date,
    priority: todo.priority,
    pushCount: todo.pushCount,
    completedAt: nowCST(),
    notes: notes || null,
  });

  console.log(JSON.stringify({ ok: true, completed: id, text: todo.text }));
}

async function todosMove(id, targetSectionId) {
  const todo = await db.collection("todos").findOne({ _id: id });
  if (!todo) {
    console.log(JSON.stringify({ ok: false, error: `Todo ${id} not found` }));
    return;
  }

  // Ensure target section exists
  const section = await db.collection("todo_sections").findOne({ _id: targetSectionId });
  if (!section) {
    const d = new Date(targetSectionId + "T12:00:00");
    const dayName = d.toLocaleDateString("en-US", { weekday: "long", timeZone: TZ });
    const sectionCount = await db.collection("todo_sections").countDocuments();
    await db.collection("todo_sections").insertOne({
      _id: targetSectionId,
      title: `${dayName} (${targetSectionId})`,
      date: targetSectionId,
      order: sectionCount,
    });
  }

  // Update todo
  await db.collection("todos").updateOne(
    { _id: id },
    {
      $set: { sectionId: targetSectionId, date: targetSectionId },
      $inc: { pushCount: 1 },
    }
  );

  console.log(JSON.stringify({ ok: true, moved: id, to: targetSectionId }));
}

async function todosDelete(id) {
  const result = await db.collection("todos").deleteOne({ _id: id });
  console.log(JSON.stringify({ ok: result.deletedCount > 0, deleted: id }));
}

async function todosSectionAdd(jsonStr) {
  const data = parseJsonArg(jsonStr);
  const sectionCount = await db.collection("todo_sections").countDocuments();
  await db.collection("todo_sections").insertOne({
    _id: data.id,
    title: data.title,
    date: data.date || null,
    order: data.order ?? sectionCount,
  });
  console.log(JSON.stringify({ ok: true, id: data.id }));
}

async function todosSectionUpdate(id, jsonStr) {
  const data = parseJsonArg(jsonStr);
  await db.collection("todo_sections").updateOne({ _id: id }, { $set: data });
  console.log(JSON.stringify({ ok: true, updated: id }));
}

// ── Archive Commands ─────────────────────────────────────────────────
async function archiveList(args) {
  const filter = {};
  let limit = 50;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--date" && args[i + 1]) {
      filter.completedAt = { $regex: args[++i] };
    } else if (args[i] === "--project" && args[i + 1]) {
      filter.project = args[++i];
    } else if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[++i]);
    }
  }

  const items = await db.collection("todo_archive")
    .find(filter)
    .sort({ completedAt: -1 })
    .limit(limit)
    .toArray();

  console.log(JSON.stringify(items, null, 2));
}

async function archiveSearch(text) {
  const items = await db.collection("todo_archive")
    .find({ text: { $regex: text, $options: "i" } })
    .sort({ completedAt: -1 })
    .limit(20)
    .toArray();
  console.log(JSON.stringify(items, null, 2));
}

// ── Scores Commands ──────────────────────────────────────────────────
async function scoresAdd(jsonStr) {
  const data = parseJsonArg(jsonStr);
  const filter = { engineer: data.engineer, date: data.date };

  await db.collection("engineer_scores").updateOne(
    filter,
    { $set: data },
    { upsert: true }
  );
  console.log(JSON.stringify({ ok: true, engineer: data.engineer, date: data.date }));
}

async function scoresGet(engineer, args) {
  const filter = { engineer };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--date" && args[i + 1]) {
      filter.date = args[++i];
    }
  }
  const entries = await db.collection("engineer_scores")
    .find(filter)
    .sort({ date: 1 })
    .toArray();
  console.log(JSON.stringify(entries, null, 2));
}

// ── Generic Pulse/Entry Commands ─────────────────────────────────────
async function pulseAdd(collection, jsonStr) {
  const data = parseJsonArg(jsonStr);
  const id = data._id || data.date || todayStr();
  await db.collection(collection).updateOne(
    { _id: id },
    { $set: { ...data, _id: id } },
    { upsert: true }
  );
  console.log(JSON.stringify({ ok: true, collection, id }));
}

async function pulseGet(collection, args) {
  const filter = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--date" && args[i + 1]) {
      filter.date = args[++i];
    }
  }
  const entries = await db.collection(collection)
    .find(filter)
    .sort({ date: -1 })
    .limit(30)
    .toArray();
  console.log(JSON.stringify(entries, null, 2));
}

// ── Feedback / Mental Health ─────────────────────────────────────────
async function feedbackAdd(jsonStr) { return pulseAdd("manager_feedback", jsonStr); }
async function mentalHealthAdd(jsonStr) { return pulseAdd("mental_health", jsonStr); }

// ── Wishlist Commands ────────────────────────────────────────────────
async function wishlistList() {
  const items = await db.collection("wishlist").find().sort({ priority: 1 }).toArray();
  const config = await db.collection("config").findOne({ _id: "wishlist" });
  console.log(JSON.stringify({ config, items }, null, 2));
}

async function wishlistAdd(jsonStr) {
  const data = parseJsonArg(jsonStr);
  const id = data.title.toLowerCase().replace(/\s+/g, "-").slice(0, 50) + "-" + Date.now();
  await db.collection("wishlist").insertOne({ ...data, _id: id });
  console.log(JSON.stringify({ ok: true, id }));
}

async function wishlistUpdate(id, jsonStr) {
  const data = parseJsonArg(jsonStr);
  await db.collection("wishlist").updateOne({ _id: id }, { $set: data });
  console.log(JSON.stringify({ ok: true, updated: id }));
}

// ── Milestones Commands ──────────────────────────────────────────────
async function milestonesGet() {
  const data = await db.collection("milestones").findOne({ _id: "fc" });
  console.log(JSON.stringify(data, null, 2));
}

async function milestonesUpdate(jsonStr) {
  const data = parseJsonArg(jsonStr);
  await db.collection("milestones").updateOne({ _id: "fc" }, { $set: data }, { upsert: true });
  console.log(JSON.stringify({ ok: true }));
}

// ── AI Memory Commands ──────────────────────────────────────────────

async function memoryAdd(jsonStr) {
  const data = parseJsonArg(jsonStr);
  const now = new Date().toISOString();
  const id = data.name || data._id;
  if (!id || !data.content || !data.type) {
    console.log(JSON.stringify({ ok: false, error: "Required: name, content, type (user|feedback|project|reference|context)" }));
    return;
  }
  const doc = {
    name: id,
    content: data.content,
    type: data.type,
    tags: data.tags || [],
    source: data.source || "claude-code",
    createdAt: now,
    updatedAt: now,
  };
  const existing = await db.collection("ai_memory").findOne({ name: id });
  if (existing) {
    await db.collection("ai_memory").updateOne(
      { name: id },
      { $set: { content: doc.content, type: doc.type, tags: doc.tags, source: doc.source, updatedAt: now } }
    );
  } else {
    await db.collection("ai_memory").insertOne(doc);
  }
  console.log(JSON.stringify({ ok: true, name: id, type: data.type }));
}

async function memoryList(typeFilter) {
  const filter = typeFilter ? { type: typeFilter } : {};
  const memories = await db.collection("ai_memory").find(filter).sort({ updatedAt: -1 }).toArray();
  memories.forEach(m => {
    console.log(`[${m.type}] ${m.name} — ${m.content.substring(0, 100)}`);
  });
  console.log(`\nTotal: ${memories.length}`);
}

async function memoryGet(name) {
  const mem = await db.collection("ai_memory").findOne({ name });
  if (!mem) {
    console.log(JSON.stringify({ ok: false, error: `Memory "${name}" not found` }));
    return;
  }
  console.log(JSON.stringify(mem, null, 2));
}

async function memorySearch(text) {
  const memories = await db.collection("ai_memory").find({
    $or: [
      { name: { $regex: text, $options: "i" } },
      { content: { $regex: text, $options: "i" } },
      { tags: { $regex: text, $options: "i" } },
    ]
  }).toArray();
  memories.forEach(m => {
    console.log(`[${m.type}] ${m.name} — ${m.content.substring(0, 120)}`);
  });
  console.log(`\nMatches: ${memories.length}`);
}

async function memoryDelete(name) {
  const result = await db.collection("ai_memory").deleteOne({ name });
  console.log(JSON.stringify({ ok: result.deletedCount > 0, deleted: name }));
}

async function memoryUpdate(name, jsonStr) {
  const data = parseJsonArg(jsonStr);
  const now = new Date().toISOString();
  const update = { updatedAt: now };
  if (data.content) update.content = data.content;
  if (data.type) update.type = data.type;
  if (data.tags) update.tags = data.tags;
  const result = await db.collection("ai_memory").updateOne(
    { name },
    { $set: update }
  );
  if (result.matchedCount === 0) {
    console.log(JSON.stringify({ ok: false, error: `Memory "${name}" not found` }));
    return;
  }
  console.log(JSON.stringify({ ok: true, updated: name }));
}

// ── Recurring Task Commands ──────────────────────────────────────────

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function calcNextDue(task, fromDate) {
  const from = fromDate || todayStr();
  const d = new Date(from + "T12:00:00");
  const dow = d.getDay();

  switch (task.cycle) {
    case "daily":
      return addDays(from, 1);

    case "weekly": {
      return addDays(from, 7);
    }

    case "biweekly": {
      return addDays(from, 14);
    }

    case "monthly": {
      const anchor = task.anchorDay;
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      next.setDate(Math.min(anchor, daysInMonth(next.getFullYear(), next.getMonth())));
      return next.toLocaleDateString("en-CA", { timeZone: TZ });
    }

    case "every_n_days": {
      return addDays(from, task.interval);
    }

    default:
      return addDays(from, 1);
  }
}

async function recurringList() {
  const tasks = await db.collection("recurring_tasks")
    .find({ active: true })
    .sort({ nextDue: 1 })
    .toArray();
  console.log(JSON.stringify(tasks, null, 2));
}

async function recurringAdd(jsonStr) {
  const data = parseJsonArg(jsonStr);
  const now = new Date().toISOString();
  const id = data._id || "rt_" + data.text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);

  const doc = {
    _id: id,
    text: data.text,
    project: (data.project || "PER").toUpperCase(),
    priority: data.priority || null,
    cycle: data.cycle || "daily",
    interval: data.interval || null,
    anchorDay: data.anchorDay ?? null,
    lastTriggered: data.lastTriggered || null,
    nextDue: data.nextDue || todayStr(),
    time: data.time || null,
    timeEnd: data.timeEnd || null,
    notes: data.notes || null,
    active: data.active !== undefined ? data.active : true,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("recurring_tasks").updateOne(
    { _id: id },
    { $set: doc },
    { upsert: true }
  );
  console.log(JSON.stringify({ ok: true, id, ...doc }));
}

async function recurringTrigger(id) {
  // Claim atómico — si otra corrida (API, cron, CLI en otra terminal) ya la
  // disparó hoy, no duplicamos. Filtra además por active:true.
  const today = todayStr();
  const claimed = await db.collection("recurring_tasks").findOneAndUpdate(
    { _id: id, active: true, $or: [{ lastTriggered: { $ne: today } }, { lastTriggered: null }] },
    { $set: { lastTriggered: today, updatedAt: new Date().toISOString() } },
    { returnDocument: "before" },
  );
  if (!claimed) {
    const exists = await db.collection("recurring_tasks").findOne({ _id: id });
    if (!exists) {
      console.log(JSON.stringify({ ok: false, error: `Recurring task ${id} not found` }));
    } else {
      console.log(JSON.stringify({ ok: true, triggered: id, alreadyTriggeredToday: true }));
    }
    return;
  }
  const task = claimed;

  // Bandeja genérica "today" — misma convención que el API y el cron. Así
  // iOS y la web siempre encuentran los recurring en un solo lugar y no se
  // esconde la sección por colisionar con un section fechado.
  const sectionId = "today";
  const existingSection = await db.collection("todo_sections").findOne({ _id: sectionId });
  if (!existingSection) {
    const count = await db.collection("todo_sections").countDocuments();
    await db.collection("todo_sections").insertOne({
      _id: sectionId,
      title: "Today",
      date: null,
      order: count,
    });
  }

  // Dedupe: si ya quedó un todo abierto con el mismo texto+source en la
  // bandeja today, no creamos duplicado.
  const existing = await db.collection("todos").findOne({
    sectionId,
    source: "recurring",
    text: task.text,
  });

  let todoId;
  if (existing) {
    todoId = existing._id;
  } else {
    todoId = generateId();
    await db.collection("todos").insertOne({
      _id: todoId,
      sectionId,
      text: task.text,
      project: task.project,
      date: today,
      priority: task.priority,
      pushCount: 0,
      time: task.time || null,
      timeEnd: task.timeEnd || null,
      source: "recurring",
      notes: task.notes,
    });
  }

  const nextDue = calcNextDue(task, today);
  await db.collection("recurring_tasks").updateOne(
    { _id: id },
    { $set: { nextDue, updatedAt: new Date().toISOString() } },
  );

  console.log(JSON.stringify({
    ok: true,
    triggered: id,
    todoCreated: todoId,
    text: task.text,
    lastTriggered: today,
    nextDue,
  }));
}

async function recurringDue() {
  const today = todayStr();
  const tasks = await db.collection("recurring_tasks")
    .find({ active: true, nextDue: { $lte: today } })
    .sort({ nextDue: 1 })
    .toArray();
  console.log(JSON.stringify(tasks, null, 2));
}

async function recurringPause(id) {
  const result = await db.collection("recurring_tasks").updateOne(
    { _id: id },
    { $set: { active: false, updatedAt: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) {
    console.log(JSON.stringify({ ok: false, error: `Recurring task ${id} not found` }));
    return;
  }
  console.log(JSON.stringify({ ok: true, paused: id }));
}

async function recurringResume(id) {
  const result = await db.collection("recurring_tasks").updateOne(
    { _id: id },
    { $set: { active: true, updatedAt: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) {
    console.log(JSON.stringify({ ok: false, error: `Recurring task ${id} not found` }));
    return;
  }
  console.log(JSON.stringify({ ok: true, resumed: id }));
}

async function recurringDelete(id) {
  const result = await db.collection("recurring_tasks").deleteOne({ _id: id });
  console.log(JSON.stringify({ ok: result.deletedCount > 0, deleted: id }));
}

// ── Raw Commands ─────────────────────────────────────────────────────
async function rawQuery(collection, filterStr) {
  const filter = parseJsonArg(filterStr);
  const results = await db.collection(collection).find(filter).limit(100).toArray();
  console.log(JSON.stringify(results, null, 2));
}

async function rawInsert(collection, docStr) {
  const doc = parseJsonArg(docStr);
  const result = await db.collection(collection).insertOne(doc);
  console.log(JSON.stringify({ ok: true, insertedId: result.insertedId }));
}

async function rawUpdate(collection, filterStr, updateStr) {
  const filter = parseJsonArg(filterStr);
  const update = parseJsonArg(updateStr);
  const result = await db.collection(collection).updateOne(filter, update);
  console.log(JSON.stringify({ ok: true, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }));
}

async function rawDelete(collection, filterStr) {
  const filter = parseJsonArg(filterStr);
  const result = await db.collection(collection).deleteOne(filter);
  console.log(JSON.stringify({ ok: true, deletedCount: result.deletedCount }));
}

async function rawDeleteMany(collection, filterStr) {
  const filter = parseJsonArg(filterStr);
  const result = await db.collection(collection).deleteMany(filter);
  console.log(JSON.stringify({ ok: true, deletedCount: result.deletedCount }));
}

async function rawDrop(collection) {
  const ok = await db.collection(collection).drop().catch((e) => e?.codeName === "NamespaceNotFound" ? false : Promise.reject(e));
  console.log(JSON.stringify({ ok: ok !== false, dropped: ok !== false }));
}

async function rawCreateIndex(collection, keysStr, optionsStr) {
  const keys = parseJsonArg(keysStr);
  const options = optionsStr ? parseJsonArg(optionsStr) : {};
  const name = await db.collection(collection).createIndex(keys, options);
  console.log(JSON.stringify({ ok: true, name }));
}

// ── Router ───────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage: node mongo-cli.mjs <command> [args...]");
    console.log("Commands: todos, archive, scores, pulse, feedback, mental-health,");
    console.log("          wishlist, milestones, memory, recurring, raw");
    process.exit(0);
  }

  await connect();

  try {
    const [cmd, sub, ...rest] = args;

    switch (cmd) {
      case "todos":
        switch (sub) {
          case "list": await todosList(); break;
          case "add": await todosAdd(rest[0]); break;
          case "complete": await todosComplete(rest[0], rest[1]); break;
          case "move": await todosMove(rest[0], rest[1]); break;
          case "delete": await todosDelete(rest[0]); break;
          case "section-add": await todosSectionAdd(rest[0]); break;
          case "section-update": await todosSectionUpdate(rest[0], rest[1]); break;
          default: console.log("Unknown todos sub-command:", sub);
        }
        break;

      case "archive":
        switch (sub) {
          case "list": await archiveList(rest); break;
          case "search": await archiveSearch(rest[0]); break;
          default: console.log("Unknown archive sub-command:", sub);
        }
        break;

      case "scores":
        switch (sub) {
          case "add": await scoresAdd(rest[0]); break;
          case "get": await scoresGet(rest[0], rest.slice(1)); break;
          default: console.log("Unknown scores sub-command:", sub);
        }
        break;

      case "pulse":
        switch (sub) {
          case "add": await pulseAdd(rest[0], rest[1]); break;
          case "get": await pulseGet(rest[0], rest.slice(1)); break;
          default: console.log("Unknown pulse sub-command:", sub);
        }
        break;

      case "feedback": await (sub === "add" ? feedbackAdd(rest[0]) : pulseGet("manager_feedback", rest)); break;
      case "mental-health": await (sub === "add" ? mentalHealthAdd(rest[0]) : pulseGet("mental_health", rest)); break;

      case "wishlist":
        switch (sub) {
          case "list": await wishlistList(); break;
          case "add": await wishlistAdd(rest[0]); break;
          case "update": await wishlistUpdate(rest[0], rest[1]); break;
          default: console.log("Unknown wishlist sub-command:", sub);
        }
        break;

      case "milestones":
        await (sub === "get" ? milestonesGet() : milestonesUpdate(rest[0])); break;

      case "memory":
        switch (sub) {
          case "add": await memoryAdd(rest[0]); break;
          case "list": await memoryList(rest[0]); break;
          case "get": await memoryGet(rest[0]); break;
          case "search": await memorySearch(rest[0]); break;
          case "update": await memoryUpdate(rest[0], rest[1]); break;
          case "delete": await memoryDelete(rest[0]); break;
          default: console.log("Unknown memory sub-command:", sub);
        }
        break;

      case "recurring":
        switch (sub) {
          case "list": await recurringList(); break;
          case "add": await recurringAdd(rest[0]); break;
          case "trigger": await recurringTrigger(rest[0]); break;
          case "due": await recurringDue(); break;
          case "pause": await recurringPause(rest[0]); break;
          case "resume": await recurringResume(rest[0]); break;
          case "delete": await recurringDelete(rest[0]); break;
          default: console.log("Unknown recurring sub-command:", sub);
        }
        break;

      case "raw":
        switch (sub) {
          case "query": await rawQuery(rest[0], rest[1]); break;
          case "insert": await rawInsert(rest[0], rest[1]); break;
          case "update": await rawUpdate(rest[0], rest[1], rest[2]); break;
          case "delete": await rawDelete(rest[0], rest[1]); break;
          case "deleteMany": await rawDeleteMany(rest[0], rest[1]); break;
          case "drop": await rawDrop(rest[0]); break;
          case "createIndex": await rawCreateIndex(rest[0], rest[1], rest[2]); break;
          default: console.log("Unknown raw sub-command:", sub);
        }
        break;

      default:
        console.log("Unknown command:", cmd);
    }
  } finally {
    await disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
