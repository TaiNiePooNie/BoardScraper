import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { feedbackMedia, feedbackMediaChunks } from "@/db/schema";
import { serverDb } from "@/db/server";
import { FEEDBACK_LIMITS } from "@/lib/feedback";
import { validToken } from "@/lib/feedback-server";

export const dynamic = "force-dynamic";

/** Upload chunk `idx` of an attachment (raw bytes). */
export async function PUT(req: Request, { params }: { params: Promise<{ mediaId: string; idx: string }> }) {
  const p = await params;
  const mediaId = Number(p.mediaId);
  const idx = Number(p.idx);
  const db = serverDb();
  const [m] = await db.select().from(feedbackMedia).where(eq(feedbackMedia.id, mediaId));
  if (!m || !validToken(m.feedbackId, req.headers.get("x-upload-token"))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (!Number.isInteger(idx) || idx < 0 || idx >= m.chunks) return NextResponse.json({ error: "Bad chunk" }, { status: 400 });
  const data = Buffer.from(await req.arrayBuffer());
  const expected = idx === m.chunks - 1 ? m.size - idx * FEEDBACK_LIMITS.chunkBytes : FEEDBACK_LIMITS.chunkBytes;
  if (data.length !== expected) return NextResponse.json({ error: "Chunk size mismatch" }, { status: 400 });
  await db.insert(feedbackMediaChunks).values({ mediaId, idx, data }).onConflictDoUpdate({ target: [feedbackMediaChunks.mediaId, feedbackMediaChunks.idx], set: { data } });
  return NextResponse.json({ ok: true });
}
