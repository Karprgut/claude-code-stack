import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { getDb } from "./mongodb";
import { DATA_DIR } from "./constants";

function safePath(relativePath: string): string {
  const resolved = path.resolve(DATA_DIR, relativePath);
  if (!resolved.startsWith(path.resolve(DATA_DIR))) {
    throw new Error("Path traversal not allowed");
  }
  return resolved;
}

function todayStr(): string {
  const tz = process.env.FLINT_TIMEZONE || "America/New_York";
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function generateTodoId(): string {
  const epoch = Date.now();
  const seq = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `t_${epoch}_${seq}`;
}

const PROJECT_CODE_MAP: Record<string, string> = {
  work: "work",
  personal: "per",
  per: "per",
};

function normalizeProjectCode(project: string): string {
  // people._id in Mongo is stored as uppercase `PROJECT:slug` (see migration),
  // so all personId references must match that case.
  return (PROJECT_CODE_MAP[project.toLowerCase()] || project).toUpperCase();
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "read_file": {
        const filePath = safePath(input.path as string);
        const content = readFileSync(filePath, "utf-8");
        return content.length > 10000
          ? content.slice(0, 10000) + "\n...(truncated)"
          : content;
      }

      case "list_files": {
        const dirPath = safePath(input.path as string);
        const entries = readdirSync(dirPath);
        const results = entries.map((e) => {
          const full = path.join(dirPath, e);
          const isDir = statSync(full).isDirectory();
          return `${isDir ? "d " : "f "} ${e}`;
        });
        return results.join("\n");
      }

      case "mongodb_query": {
        const db = await getDb();
        const col = db.collection(input.collection as string);
        const filter = (input.filter as Record<string, unknown>) || {};
        const sort = (input.sort as Record<string, 1 | -1>) || {};
        const limit = Math.min((input.limit as number) || 20, 50);
        const docs = await col.find(filter).sort(sort).limit(limit).toArray();
        return JSON.stringify(docs, null, 2);
      }

      case "create_todo": {
        const db = await getDb();
        const date = todayStr();
        const sectionId = (input.section as string) || date;

        // Ensure section exists in todo_sections
        const existing = await db.collection("todo_sections").findOne({ _id: sectionId } as any);
        if (!existing) {
          const count = await db.collection("todo_sections").countDocuments();
          const dayName = new Date(sectionId + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", timeZone: process.env.FLINT_TIMEZONE || "America/New_York" });
          await db.collection("todo_sections").insertOne({
            _id: sectionId,
            title: `${dayName} (${sectionId})`,
            date: sectionId,
            order: count,
          } as any);
        }

        const todo = {
          _id: generateTodoId(),
          sectionId,
          text: input.text as string,
          project: (input.project as string || "PER").toUpperCase(),
          date,
          priority: (input.priority as string) || null,
          pushCount: 0,
          time: null,
          timeEnd: null,
          source: null,
          notes: null,
        };
        await db.collection("todos").insertOne(todo as any);
        return `Created todo ${todo._id}: ${todo.text}`;
      }

      case "complete_todo": {
        const db = await getDb();
        const id = input.id as string;
        const todo = await db.collection("todos").findOne({ _id: id as any });
        if (!todo) return `Todo ${id} not found`;
        await db.collection("todo_archive").insertOne({
          ...todo,
          completedAt: new Date().toISOString(),
        });
        await db.collection("todos").deleteOne({ _id: id as any });
        return `Completed: ${todo.text}`;
      }

      case "add_note": {
        const db = await getDb();
        const date = (input.date as string) || todayStr();
        const note = input.note as string;
        const personSlug = input.person_slug as string;
        const project = input.project as string;
        const projectCode = normalizeProjectCode(project);
        const personId = `${projectCode}:${personSlug}`;

        // Check if there's an existing log for this person+date, append to it
        const existingLog = await db.collection("people_logs").findOne({ personId, date });
        if (existingLog) {
          await db.collection("people_logs").updateOne(
            { _id: existingLog._id },
            { $push: { entries: { text: note, timestamp: new Date().toISOString() } } as any }
          );
        } else {
          await db.collection("people_logs").insertOne({
            personId,
            date,
            title: note.slice(0, 60),
            entries: [{ text: note, timestamp: new Date().toISOString() }],
          });
        }
        return `Note added for ${personSlug} on ${date}`;
      }

      case "search": {
        const query = input.query as string;
        const db = await getDb();
        const collections = ["todos", "people_logs", "engineer_scores", "daily_summaries"];
        const results: string[] = [];
        for (const col of collections) {
          try {
            const docs = await db
              .collection(col)
              .find({ $text: { $search: query } })
              .limit(5)
              .toArray();
            if (docs.length > 0) {
              results.push(`--- ${col} (${docs.length} matches) ---`);
              results.push(JSON.stringify(docs, null, 2));
            }
          } catch {
            // Collection may not have text index
          }
        }
        return results.length > 0 ? results.join("\n") : "No results found";
      }

      case "save_memory": {
        const db = await getDb();
        const now = new Date().toISOString();
        const memName = input.name as string;
        const content = input.content as string;
        const type = input.type as string;
        const tags = input.tags ? (input.tags as string).split(",").map((t: string) => t.trim()) : [];

        // Check for existing memory with same name — update instead of duplicate
        const existing = await db.collection("ai_memory").findOne({ name: memName });
        if (existing) {
          await db.collection("ai_memory").updateOne(
            { _id: existing._id },
            { $set: { content, type, tags, updatedAt: now } }
          );
          return `Memory updated: "${memName}"`;
        }

        await db.collection("ai_memory").insertOne({
          name: memName,
          content,
          type,
          tags,
          source: "flint-chat",
          createdAt: now,
          updatedAt: now,
        });
        return `Memory saved: "${memName}"`;
      }

      case "request_code_change": {
        const db = await getDb();
        const description = (input.description as string)?.trim();
        if (!description) return "Error: description is required";
        const taskId = `cct_${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
        await db.collection("claude_code_tasks").insertOne({
          _id: taskId as any,
          prompt: description,
          status: "queued",
          requestedBy: "flint-chat",
          createdAt: new Date().toISOString(),
        });
        // Fire push notification (best-effort, don't block on failure)
        try {
          const topic = process.env.NTFY_TOPIC;
          if (topic) {
            const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
            await fetch(`https://ntfy.sh/${topic}`, {
              method: "POST",
              headers: {
                "Title": "Flint chat: code task pending",
                "Priority": "high",
                "Tags": "robot",
                "Click": `${baseUrl}/tasks`,
                "Actions": [
                  `http, Approve, ${baseUrl}/api/claude-code-tasks/${taskId}/approve, method=POST, clear=true`,
                  `http, Reject, ${baseUrl}/api/claude-code-tasks/${taskId}/reject, method=POST, clear=true`,
                ].join("; "),
              },
              body: description.slice(0, 400),
            });
          }
        } catch (err) {
          console.error("ntfy push failed:", err);
        }
        return `Task queued: ${taskId}\nApprove from your phone (iOS push) or at /tasks. Once approved, your Mac runs Claude Code on it.`;
      }

      case "check_code_task": {
        const db = await getDb();
        const taskId = (input.task_id as string)?.trim();
        if (!taskId) return "Error: task_id is required";
        const task = await db.collection("claude_code_tasks").findOne({ _id: taskId as any });
        if (!task) return `Task ${taskId} not found`;
        const lines = [
          `Status: ${task.status}`,
          `Mode: ${task.mode}`,
          `Created: ${task.createdAt}`,
        ];
        if (task.claimedAt) lines.push(`Claimed: ${task.claimedAt}`);
        if (task.completedAt) lines.push(`Completed: ${task.completedAt}`);
        if (task.error) lines.push(`Error: ${task.error}`);
        if (task.result) lines.push(`\nResult:\n${String(task.result).slice(0, 4000)}`);
        return lines.join("\n");
      }

      case "todo_move": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const res = await fetch(`${baseUrl}/api/todo/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: input.id, targetDate: input.targetDate }),
        });
        if (!res.ok) return `Error: ${res.status}`;
        return `Todo ${input.id} moved to ${input.targetDate}`;
      }

      case "todo_delete": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const res = await fetch(`${baseUrl}/api/todo/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: input.id }),
        });
        if (!res.ok) return `Error: ${res.status}`;
        return `Todo ${input.id} deleted`;
      }

      case "ceramics_upsert_formula": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const cones = (input.firingCones as string)?.split(",").map((s) => s.trim()).filter(Boolean);
        let ingredients: unknown = undefined;
        if (input.ingredients) {
          try { ingredients = JSON.parse(input.ingredients as string); }
          catch { return "Error: ingredients must be valid JSON array"; }
        }
        let groupWeights: unknown = undefined;
        if (input.groupWeights) {
          try { groupWeights = JSON.parse(input.groupWeights as string); }
          catch { return "Error: groupWeights must be valid JSON object"; }
        }
        const body: Record<string, unknown> = {
          _id: input._id,
          type: input.type,
          name: input.name,
          description: input.description,
          temperatura: input.temperatura,
          tecnica: input.tecnica,
          textura: input.textura,
          color: input.color,
          firingCones: cones,
          ingredients,
          groupWeights,
          plasticity: input.plasticity,
          shrinkage: input.shrinkage,
          wheelEase: input.wheelEase,
          handBuildEase: input.handBuildEase,
          porosity: input.porosity,
          notes: input.notes,
        };
        const res = await fetch(`${baseUrl}/api/ceramics/formulas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return `Error: ${res.status} ${await res.text()}`;
        const j = await res.json();
        return `Formula saved: ${j.formula?._id} (${input.name})`;
      }

      case "ceramics_delete_formula": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const res = await fetch(`${baseUrl}/api/ceramics/formulas/${encodeURIComponent(String(input.id))}`, {
          method: "DELETE",
        });
        if (!res.ok) return `Error: ${res.status}`;
        return `Formula ${input.id} deleted`;
      }

      case "ceramics_duplicate_formula": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const res = await fetch(`${baseUrl}/api/ceramics/formulas/${encodeURIComponent(String(input.id))}/duplicate`, {
          method: "POST",
        });
        if (!res.ok) return `Error: ${res.status}`;
        const j = await res.json();
        return `Duplicated. New formula _id: ${j.formula?._id} (v${j.formula?.version})`;
      }

      case "ceramics_add_firing": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const date = (input.date as string)?.trim() || todayStr();
        const batchIds = (input.batchIds as string)?.split(",").map((s) => s.trim()).filter(Boolean);
        const formulasUsed = (input.formulasUsed as string)?.split(",").map((s) => s.trim()).filter(Boolean);
        const body: Record<string, unknown> = {
          date,
          type: input.type,
          cone: input.cone,
          results: input.results,
          batchIds,
          formulasUsed,
        };
        const res = await fetch(`${baseUrl}/api/ceramics/firings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return `Error: ${res.status} ${await res.text()}`;
        return `Firing logged: ${input.type}${input.cone ? ` cone ${input.cone}` : ""} on ${date}`;
      }

      case "add_director_score": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const date = (input.date as string)?.trim() || todayStr();
        const body: Record<string, unknown> = {
          directorSlug: input.directorSlug,
          project: input.project || "ADG",
          date,
          responsiveness: input.responsiveness,
          delegation: input.delegation,
          strategicThinking: input.strategicThinking,
          collaboration: input.collaboration,
          execution: input.execution,
          leadership: input.leadership,
          note: input.note,
          determination: input.determination,
        };
        const res = await fetch(`${baseUrl}/api/director-scores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return `Error: ${res.status} ${await res.text()}`;
        return `Director score saved for ${input.directorSlug} on ${date}`;
      }

      case "add_client_health": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const res = await fetch(`${baseUrl}/api/client-health`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) return `Error: ${res.status} ${await res.text()}`;
        return `Client health entry saved for ${input.clientCode}`;
      }

      case "add_engineer_score": {
        const db = await getDb();
        const date = (input.date as string)?.trim() || todayStr();
        const dims = ["velocity","quality","reliability","communication","collaboration","initiative","technicalDepth","ownership","coachability","autonomy","attitude"] as const;
        const scores: Record<string, number> = {};
        for (const d of dims) scores[d] = Number(input[d]);
        const overall = Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / dims.length) * 10) / 10;
        const doc = {
          _id: `${input.engineer}_${date}` as any,
          engineer: input.engineer,
          date,
          ...scores,
          overall,
          note: input.note ?? "",
          determination: input.determination,
          createdAt: new Date().toISOString(),
        };
        await db.collection("engineer_scores").replaceOne({ _id: doc._id }, doc, { upsert: true });
        return `Engineer score saved: ${input.engineer} ${date} (overall ${overall})`;
      }

      case "add_manager_feedback": {
        const db = await getDb();
        const date = (input.date as string)?.trim() || todayStr();
        const dims = ["delegation","growthConversations","biasAwareness","decisionQuality","peerDynamics","timeManagement","communication","strategicThinking"] as const;
        const dimensions: Record<string, number> = {};
        for (const d of dims) dimensions[d] = Number(input[d]);
        const overall = Math.round((Object.values(dimensions).reduce((a, b) => a + b, 0) / dims.length) * 10) / 10;
        const doc = {
          _id: date as any,
          date,
          dimensions,
          overall,
          topStrength: input.topStrength ?? "",
          biggestGrowthArea: input.biggestGrowthArea ?? "",
          actionItem: input.actionItem ?? "",
          determination: input.determination,
          createdAt: new Date().toISOString(),
        };
        await db.collection("manager_feedback").replaceOne({ _id: doc._id }, doc, { upsert: true });
        return `Manager feedback saved for ${date} (overall ${overall})`;
      }

      case "log_mood": {
        const db = await getDb();
        const date = (input.date as string)?.trim() || todayStr();
        const mood = (input.mood as string)?.trim();
        const moodScore = Number(input.moodScore);
        if (!mood || !Number.isFinite(moodScore)) return "Error: mood and numeric moodScore required";
        const notes = (input.notes as string) || undefined;
        await db.collection("mental_health").updateOne(
          { _id: date as any },
          { $set: { date, mood, moodScore, ...(notes ? { notes } : {}) }, $setOnInsert: { _id: date } },
          { upsert: true }
        );
        return `Mood logged for ${date}: ${mood} (${moodScore}/10)`;
      }

      case "log_sleep": {
        const db = await getDb();
        const date = (input.date as string)?.trim() || todayStr();
        const sleepScore = Number(input.sleepScore);
        if (!Number.isFinite(sleepScore)) return "Error: numeric sleepScore required";
        const sleepNotes = (input.sleepNotes as string) || "";
        const sleepAid = (input.sleepAid as string) || "";
        await db.collection("mental_health").updateOne(
          { _id: date as any },
          { $set: { date, sleepScore, sleepNotes, sleepAid }, $setOnInsert: { _id: date } },
          { upsert: true }
        );
        return `Sleep logged for ${date}: ${sleepScore}/10`;
      }

      case "wishlist_add": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const body: Record<string, unknown> = {
          action: "add",
          name: input.name,
          price: input.price,
          currency: input.currency,
          url: input.url,
          category: input.category,
          notes: input.notes,
        };
        const res = await fetch(`${baseUrl}/api/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return `Error: ${res.status}`;
        return `Wishlist item added: ${input.name}`;
      }

      case "wishlist_toggle_purchased": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const res = await fetch(`${baseUrl}/api/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "purchase", id: input.id }),
        });
        if (!res.ok) return `Error: ${res.status}`;
        return `Toggled purchased state for ${input.id}`;
      }

      case "toggle_person_favorite": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const project = String(input.project || "").toLowerCase();
        const slug = String(input.slug || "");
        const personPath = `${project}/people/${slug}`;
        const res = await fetch(`${baseUrl}/api/people/favorite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personPath, favorite: Boolean(input.favorite) }),
        });
        if (!res.ok) return `Error: ${res.status}`;
        return `Person ${slug} favorite=${input.favorite}`;
      }

      case "ceramics_add_batch": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const res = await fetch(`${baseUrl}/api/ceramics/batches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            count: Number(input.count),
            series: input.series,
            formulaPasta: input.formulaPasta,
            state: input.state,
            notes: input.notes,
          }),
        });
        if (!res.ok) return `Error: ${res.status}`;
        return `Ceramics batch added: ${input.count} pieces${input.series ? ` (${input.series})` : ""}`;
      }

      case "ceramics_update_batch_state": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const id = String(input.id || "");
        const res = await fetch(`${baseUrl}/api/ceramics/batches/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: input.state }),
        });
        if (!res.ok) return `Error: ${res.status}`;
        return `Batch ${id} -> ${input.state}`;
      }

      case "log_food": {
        const meal = (input.meal as string)?.trim();
        const what = (input.what as string)?.trim();
        const date = (input.date as string)?.trim() || todayStr();
        if (!meal || !what) return "Error: meal and what are required";
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        try {
          const res = await fetch(`${baseUrl}/api/wellness/food`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meal, what, date }),
          });
          if (!res.ok) return `Error: server returned ${res.status}`;
          const j = await res.json();
          const macros = j.doc?.calories ? ` (${j.doc.calories} kcal)` : "";
          return `Food logged: ${meal} — ${what}${macros}`;
        } catch (err) {
          return `Error: ${err instanceof Error ? err.message : "fetch failed"}`;
        }
      }

      case "log_exercise": {
        const activity = (input.activity as string)?.trim();
        const notes = (input.notes as string)?.trim() || "";
        const date = (input.date as string)?.trim() || todayStr();
        if (!activity) return "Error: activity is required";
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        try {
          const res = await fetch(`${baseUrl}/api/wellness/exercise`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activity, notes, date }),
          });
          if (!res.ok) return `Error: server returned ${res.status}`;
          return `Exercise logged: ${activity}${notes ? ` — ${notes}` : ""}`;
        } catch (err) {
          return `Error: ${err instanceof Error ? err.message : "fetch failed"}`;
        }
      }

      case "get_overview":
      case "get_wellness_today":
      case "get_apple_health_today":
      case "get_client_health":
      case "get_ceramics_summary":
      case "get_milestones": {
        const endpointMap: Record<string, string> = {
          get_overview: "/api/overview",
          get_wellness_today: "/api/wellness",
          get_apple_health_today: "/api/health-data",
          get_client_health: "/api/client-health",
          get_ceramics_summary: "/api/ceramics/summary",
          get_milestones: "/api/milestones",
        };
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const res = await fetch(`${baseUrl}${endpointMap[name]}`);
        if (!res.ok) return `Error: ${res.status}`;
        const json = await res.json();
        return JSON.stringify(json, null, 2).slice(0, 10000);
      }

      case "get_recurring_due": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const res = await fetch(`${baseUrl}/api/recurring`);
        if (!res.ok) return `Error: ${res.status}`;
        const all = (await res.json()) as Array<{ _id: string; text: string; project: string; priority?: string | null; cycle: string; nextDue: string; active: boolean; notes?: string }>;
        if (all.length === 0) return "No recurring tasks defined yet.";
        const today = todayStr();
        const due = all.filter((t) => t.active && t.nextDue <= today);
        const upcoming = all.filter((t) => t.active && t.nextDue > today);
        const paused = all.filter((t) => !t.active);
        const fmt = (t: typeof all[number]) =>
          `  - ${t._id}: ${t.text} [${t.project}/${t.cycle}${t.priority ? `/${t.priority}` : ""}] next: ${t.nextDue}`;
        const lines: string[] = [
          `Total active: ${due.length + upcoming.length} · Due today: ${due.length} · Paused: ${paused.length}`,
          "",
          `DUE TODAY (${due.length}):`,
          ...(due.length ? due.map(fmt) : ["  (none)"]),
          "",
          `UPCOMING (${upcoming.length}):`,
          ...(upcoming.length ? upcoming.map(fmt) : ["  (none)"]),
        ];
        if (paused.length > 0) {
          lines.push("", `PAUSED (${paused.length}):`, ...paused.map(fmt));
        }
        return lines.join("\n");
      }

      case "trigger_recurring": {
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const res = await fetch(`${baseUrl}/api/recurring`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "trigger", id: input.id }),
        });
        if (!res.ok) return `Error: ${res.status}`;
        return `Triggered ${input.id} — todo created`;
      }

      case "get_mental_health_history": {
        const db = await getDb();
        const days = Number(input.days) || 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        const entries = await db.collection("mental_health")
          .find({ date: { $gte: cutoffStr } })
          .sort({ date: -1 })
          .limit(60)
          .toArray();
        return JSON.stringify(entries, null, 2);
      }

      case "get_engineer_scores": {
        const db = await getDb();
        const filter: Record<string, unknown> = {};
        if (input.engineer) filter.engineer = input.engineer;
        const docs = await db.collection("engineer_scores")
          .find(filter)
          .sort({ date: -1 })
          .limit(Math.min(Number(input.limit) || 20, 100))
          .toArray();
        return JSON.stringify(docs, null, 2).slice(0, 10000);
      }

      case "get_director_scores": {
        const db = await getDb();
        const filter: Record<string, unknown> = {};
        if (input.directorSlug) filter.directorSlug = input.directorSlug;
        const docs = await db.collection("director_scores")
          .find(filter)
          .sort({ date: -1 })
          .limit(Math.min(Number(input.limit) || 20, 100))
          .toArray();
        return JSON.stringify(docs, null, 2).slice(0, 10000);
      }

      case "get_manager_feedback": {
        const db = await getDb();
        const docs = await db.collection("manager_feedback")
          .find({})
          .sort({ date: -1 })
          .limit(Math.min(Number(input.limit) || 14, 60))
          .toArray();
        return JSON.stringify(docs, null, 2).slice(0, 10000);
      }

      case "get_daily_summary": {
        const db = await getDb();
        const date = (input.date as string)?.trim() || (() => {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          return y.toISOString().slice(0, 10);
        })();
        const doc = await db.collection("daily_summaries").findOne({ _id: date as unknown as string } as Record<string, unknown>);
        if (!doc) return `No daily summary for ${date}`;
        return `# Daily Summary — ${date}\n\n${doc.content ?? ""}`;
      }

      case "get_ai_costs": {
        const days = Number(input.days) || 30;
        const baseUrl = process.env.FLINT_BASE_URL || "https://<tu-dominio-de-flint>";
        const res = await fetch(`${baseUrl}/api/ai-costs?days=${days}`);
        if (!res.ok) return `Error: ${res.status}`;
        return JSON.stringify(await res.json(), null, 2).slice(0, 8000);
      }

      case "search_memory": {
        const db = await getDb();
        const query = input.query as string;
        const type = input.type as string | undefined;
        const limit = Math.min((input.limit as number) || 10, 30);

        const filter: Record<string, unknown> = {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { content: { $regex: query, $options: "i" } },
            { tags: { $regex: query, $options: "i" } },
          ],
        };
        if (type) filter.type = type;

        const docs = await db.collection("ai_memory")
          .find(filter)
          .sort({ updatedAt: -1 })
          .limit(limit)
          .toArray();

        if (docs.length === 0) return "No memories found.";
        return docs.map((d) =>
          `[${d.type}] ${d.name} (${d.source}, ${d.updatedAt?.slice(0, 10) || "?"})\n${d.content}`
        ).join("\n---\n");
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return `Error: ${message}`;
  }
}
