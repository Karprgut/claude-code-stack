#!/usr/bin/env node
// Flint Code Task Watcher
// Polls MongoDB for approved claude_code_tasks, runs Claude Code on them,
// posts the result back to the dashboard, and pushes a notification on completion.
//
// Config: reads from ~/.flint/watcher.env
//   MONGODB_URI=mongodb+srv://...
//   FLINT_BASE_URL=https://<tu-dominio-de-flint>
//   FLINT_WORKER_TOKEN=<shared secret matching dashboard env>
//   NTFY_TOPIC=<your-ntfy-topic>
//   PROJECT_DIR=/ruta/absoluta/al/repo/de/flint
//   CLAUDE_BIN=claude               (override if not on PATH)
//   POLL_INTERVAL_MS=15000

import { MongoClient } from "mongodb";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function loadEnv() {
  try {
    const txt = readFileSync(join(homedir(), ".flint", "watcher.env"), "utf-8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] = m[2].trim();
    }
  } catch {
    console.error("Missing ~/.flint/watcher.env — see header of this file for format.");
    process.exit(1);
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const BASE_URL = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
const WORKER_TOKEN = process.env.FLINT_WORKER_TOKEN;
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15000);

if (!MONGODB_URI) { console.error("MONGODB_URI required"); process.exit(1); }

const client = new MongoClient(MONGODB_URI);
let db;

async function ntfy(message, opts = {}) {
  if (!NTFY_TOPIC) return;
  const headers = { "Content-Type": "text/plain" };
  if (opts.title) headers.Title = opts.title;
  if (opts.priority) headers.Priority = opts.priority;
  if (opts.tags) headers.Tags = opts.tags;
  if (opts.click) headers.Click = opts.click;
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, { method: "POST", headers, body: message });
  } catch (err) {
    console.error("ntfy push failed:", err.message);
  }
}

async function postResult(taskId, payload) {
  try {
    const res = await fetch(`${BASE_URL}/api/claude-code-tasks/${taskId}/result`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(WORKER_TOKEN ? { Authorization: `Bearer ${WORKER_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error(`POST result returned ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error("postResult failed:", err.message);
  }
}

// Tope duro para una sola tarea. Si el subprocess `claude` se cuelga
// silenciosamente (lo que pasó con cct_1776925971325_769 en 2026-04-23 —
// quedó 4 días bloqueando la cola), lo matamos para que el watcher
// pueda volver a procesar el resto. 30 min cubre tareas largas que sí
// necesitan iterar sin abrir la puerta a deadlocks indefinidos.
const TASK_TIMEOUT_MS = Number(process.env.TASK_TIMEOUT_MS || 30 * 60 * 1000);

function runClaudeCode(prompt) {
  // User explicitly chose auto-push (2026-04-19): every task ends with commit + push to main.
  const PUSH_SUFFIX = "\n\n---\nWhen done, commit your changes with a clear message and push to origin/main.";
  const fullPrompt = prompt + PUSH_SUFFIX;
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const proc = spawn(CLAUDE_BIN, ["-p", fullPrompt, "--dangerously-skip-permissions"], {
      cwd: PROJECT_DIR,
      env: process.env,
    });

    const settle = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      resolve(value);
    };

    // Mandar SIGTERM, esperar 5s, escalar a SIGKILL si sigue vivo. El
    // SIGKILL garantiza que el `proc.on("close")` dispare incluso si el
    // subprocess está bloqueado en un syscall.
    const timeoutHandle = setTimeout(() => {
      try { proc.kill("SIGTERM"); } catch {}
      const killHandle = setTimeout(() => {
        try { proc.kill("SIGKILL"); } catch {}
      }, 5000);
      proc.once("close", () => clearTimeout(killHandle));
      settle({
        ok: false,
        error: `Task exceeded ${TASK_TIMEOUT_MS / 60000} min timeout — subprocess killed`,
        stdout,
        stderr,
      });
    }, TASK_TIMEOUT_MS);

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", (err) => settle({ ok: false, error: `Spawn error: ${err.message}`, stdout, stderr }));
    proc.on("close", (code) => {
      if (code === 0) settle({ ok: true, stdout, stderr });
      else settle({ ok: false, error: `Exited with code ${code}`, stdout, stderr });
    });
  });
}

async function processTask(task) {
  const id = task._id;
  console.log(`[${new Date().toISOString()}] Processing ${id}`);
  watcherState = "working";
  currentTaskId = id;

  // Atomic claim: only one watcher (or attempt) takes the task
  const claim = await db.collection("claude_code_tasks").updateOne(
    { _id: id, status: "approved" },
    { $set: { status: "running", claimedAt: new Date().toISOString() } }
  );
  if (claim.matchedCount === 0) {
    console.log(`Task ${id} already claimed, skipping`);
    watcherState = "idle";
    currentTaskId = null;
    return;
  }

  await ntfy(`Working on: ${task.prompt.slice(0, 200)}`, {
    title: `Claude Code running (${id})`,
    priority: "low",
    tags: "hammer_and_wrench",
  });

  // Capture commit before/after to detect what landed
  const commitBefore = await getHeadCommit();
  const result = await runClaudeCode(task.prompt);
  const commitAfter = await getHeadCommit();
  const newCommit = commitAfter !== commitBefore ? commitAfter : null;

  if (result.ok) {
    const summary = (result.stdout || "(no output)").slice(0, 50000);
    await postResult(id, { status: "completed", result: summary, commit: newCommit });
    await ntfy(`✓ Done: ${task.prompt.slice(0, 120)}${newCommit ? `\nCommit: ${newCommit.slice(0, 8)}` : ""}`, {
      title: "Claude Code finished",
      priority: "default",
      tags: "white_check_mark",
      click: `${BASE_URL}/tasks`,
    });
  } else {
    await postResult(id, { status: "failed", error: result.error, result: (result.stdout || "") + "\n---STDERR---\n" + (result.stderr || "") });
    await ntfy(`✗ Failed: ${task.prompt.slice(0, 120)}\n${result.error}`, {
      title: "Claude Code failed",
      priority: "high",
      tags: "x",
      click: `${BASE_URL}/tasks`,
    });
  }
  watcherState = "idle";
  currentTaskId = null;
}

function getHeadCommit() {
  return new Promise((resolve) => {
    const p = spawn("git", ["rev-parse", "HEAD"], { cwd: PROJECT_DIR });
    let out = "";
    p.stdout.on("data", (d) => { out += d.toString(); });
    p.on("close", () => resolve(out.trim() || null));
    p.on("error", () => resolve(null));
  });
}

import { hostname } from "node:os";
const WATCHER_HOST = hostname();
const WATCHER_PID = process.pid;
let watcherState = "idle"; // "idle" | "working"
let currentTaskId = null;

async function heartbeat() {
  try {
    await db.collection("watcher_status").updateOne(
      { _id: "claude-code-watcher" },
      { $set: {
        lastTickAt: new Date().toISOString(),
        host: WATCHER_HOST,
        pid: WATCHER_PID,
        projectDir: PROJECT_DIR,
        state: watcherState,
        currentTaskId,
      } },
      { upsert: true }
    );
  } catch (err) {
    console.error("heartbeat failed:", err.message);
  }
}

// Independent heartbeat — fires every 10s regardless of whether tick() is busy
// running a long Claude Code task. Otherwise the UI thinks the watcher is offline
// during 5+ minute task executions.
function startHeartbeatLoop() {
  setInterval(() => { heartbeat().catch(() => {}); }, 10_000);
  heartbeat().catch(() => {}); // immediate first beat
}

async function tick() {
  try {
    const tasks = await db
      .collection("claude_code_tasks")
      .find({ status: "approved" })
      .sort({ createdAt: 1 })
      .limit(5)
      .toArray();
    for (const t of tasks) {
      await processTask(t);
    }
  } catch (err) {
    console.error("tick error:", err.message);
  }
}

async function main() {
  await client.connect();
  db = client.db("flint");
  console.log(`Watcher started. Polling every ${POLL_INTERVAL_MS}ms. Project: ${PROJECT_DIR}`);
  startHeartbeatLoop(); // independent heartbeat — keeps UI accurate during long tasks
  await ntfy("Watcher online", { title: "Flint task watcher", priority: "min" });

  // Loop forever
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await tick();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
