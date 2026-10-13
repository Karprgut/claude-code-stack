import { NextRequest } from "next/server";
import { getDb, COLLECTIONS } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// Both POST (from web button) and GET (from ntfy push action — ntfy can do http POST too,
// but we accept GET as a fallback for any tap-from-link surfaces).
async function approve(id: string) {
  const db = await getDb();
  const result = await db.collection(COLLECTIONS.claudeCodeTasks).updateOne(
    { _id: id as any, status: "queued" },
    { $set: { status: "approved", approvedAt: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) {
    const existing = await db.collection(COLLECTIONS.claudeCodeTasks).findOne({ _id: id as any });
    if (!existing) return { ok: false, error: "task not found" };
    return { ok: false, error: `task already ${existing.status}` };
  }
  return { ok: true };
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const out = await approve(id);
  return Response.json(out, { status: out.ok ? 200 : 409 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const out = await approve(id);
  // Return tiny HTML so taps from links show a confirmation
  const body = out.ok
    ? `<html><body style="font:16px system-ui;padding:24px;background:#0a0a0a;color:#fff"><h2>✓ Approved</h2><p>Task ${id} sent to Claude Code on your Mac.</p></body></html>`
    : `<html><body style="font:16px system-ui;padding:24px;background:#0a0a0a;color:#fff"><h2>⚠️ ${out.error}</h2></body></html>`;
  return new Response(body, { status: out.ok ? 200 : 409, headers: { "Content-Type": "text/html" } });
}
