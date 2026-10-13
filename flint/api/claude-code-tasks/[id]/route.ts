import { NextRequest } from "next/server";
import { getDb, COLLECTIONS } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const task = await db.collection(COLLECTIONS.claudeCodeTasks).findOne({ _id: id as any });
  if (!task) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(task);
}
