import { getDb, COLLECTIONS } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.watcherStatus).findOne({ _id: "claude-code-watcher" as any });
  if (!doc) {
    return Response.json({ online: false, lastTickAt: null, host: null, ageSeconds: null });
  }
  const last = new Date(doc.lastTickAt);
  const ageSeconds = Math.round((Date.now() - last.getTime()) / 1000);
  // Watcher polls every 15s; consider it online if heartbeat within last 60s
  const online = ageSeconds <= 60;
  return Response.json({
    online,
    lastTickAt: doc.lastTickAt,
    ageSeconds,
    host: doc.host,
    pid: doc.pid,
    projectDir: doc.projectDir,
    state: doc.state ?? "idle",        // "idle" | "working"
    currentTaskId: doc.currentTaskId ?? null,
  });
}
