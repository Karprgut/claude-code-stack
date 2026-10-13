import { NextRequest } from "next/server";
import { getDb, COLLECTIONS } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const status = req.nextUrl.searchParams.get("status");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 50), 200);
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  const docs = await db
    .collection(COLLECTIONS.claudeCodeTasks)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return Response.json(docs);
}
