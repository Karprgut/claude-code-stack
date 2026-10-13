import { NextRequest } from "next/server";
import { getDb, COLLECTIONS } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// Worker on <usuaria>'s Mac POSTs result here when Claude Code finishes.
// Body: { status: "completed" | "failed", result?: string, error?: string }
// Auth: Authorization: Bearer <FLINT_WORKER_TOKEN>
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const expected = process.env.FLINT_WORKER_TOKEN;
  if (expected) {
    const auth = req.headers.get("authorization") || "";
    const got = auth.replace(/^Bearer\s+/i, "");
    if (got !== expected) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const { id } = await params;
  const body = await req.json();
  const status = body.status === "failed" ? "failed" : "completed";
  const db = await getDb();
  const update: Record<string, unknown> = {
    status,
    completedAt: new Date().toISOString(),
  };
  if (body.result) update.result = String(body.result).slice(0, 50000);
  if (body.error) update.error = String(body.error).slice(0, 5000);
  if (body.commit) update.commit = String(body.commit);
  await db.collection(COLLECTIONS.claudeCodeTasks).updateOne(
    { _id: id as any },
    { $set: update }
  );
  return Response.json({ ok: true });
}
