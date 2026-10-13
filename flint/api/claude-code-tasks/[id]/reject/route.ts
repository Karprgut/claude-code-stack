import { NextRequest } from "next/server";
import { getDb, COLLECTIONS } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

async function reject(id: string) {
  const db = await getDb();
  const result = await db.collection(COLLECTIONS.claudeCodeTasks).updateOne(
    { _id: id as any, status: "queued" },
    { $set: { status: "rejected", rejectedAt: new Date().toISOString() } }
  );
  return result.matchedCount > 0 ? { ok: true } : { ok: false, error: "task not in queued state" };
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const out = await reject(id);
  return Response.json(out, { status: out.ok ? 200 : 409 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const out = await reject(id);
  const body = out.ok
    ? `<html><body style="font:16px system-ui;padding:24px;background:#0a0a0a;color:#fff"><h2>✕ Rejected</h2><p>Task ${id} discarded.</p></body></html>`
    : `<html><body style="font:16px system-ui;padding:24px;background:#0a0a0a;color:#fff"><h2>⚠️ ${out.error}</h2></body></html>`;
  return new Response(body, { status: out.ok ? 200 : 409, headers: { "Content-Type": "text/html" } });
}
