import { eq, sum } from "drizzle-orm";
import { NextResponse } from "next/server";
import { feedback, feedbackMedia } from "@/db/schema";
import { serverDb } from "@/db/server";
import { FEEDBACK_LIMITS, MediaInput, mediaLimitError } from "@/lib/feedback";
import { UPLOAD_WINDOW_MS, validToken } from "@/lib/feedback-server";

export const dynamic = "force-dynamic";

/** Announce one attachment (name, type, size); its bytes follow in chunks. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!validToken(id, req.headers.get("x-upload-token"))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const parsed = MediaInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid file" }, { status: 400 });
  const tooBig = mediaLimitError(parsed.data);
  if (tooBig) return NextResponse.json({ error: tooBig }, { status: 413 });

  const db = serverDb();
  const [fb] = await db.select({ createdAt: feedback.createdAt }).from(feedback).where(eq(feedback.id, id));
  if (!fb || Date.now() - fb.createdAt.getTime() > UPLOAD_WINDOW_MS) return NextResponse.json({ error: "This message can't take attachments anymore." }, { status: 410 });
  const existing = await db.select({ n: feedbackMedia.id }).from(feedbackMedia).where(eq(feedbackMedia.feedbackId, id));
  if (existing.length >= FEEDBACK_LIMITS.files) return NextResponse.json({ error: `Up to ${FEEDBACK_LIMITS.files} files per message` }, { status: 413 });
  const [{ total }] = await db.select({ total: sum(feedbackMedia.size) }).from(feedbackMedia).where(eq(feedbackMedia.feedbackId, id));
  if (Number(total ?? 0) + parsed.data.size > FEEDBACK_LIMITS.totalBytes) return NextResponse.json({ error: `Attachments can total up to ${FEEDBACK_LIMITS.totalBytes / 1024 / 1024} MB` }, { status: 413 });

  const chunks = Math.ceil(parsed.data.size / FEEDBACK_LIMITS.chunkBytes);
  const [m] = await db.insert(feedbackMedia).values({ feedbackId: id, ...parsed.data, chunks }).returning({ id: feedbackMedia.id });
  return NextResponse.json({ mediaId: m.id, chunks, chunkBytes: FEEDBACK_LIMITS.chunkBytes });
}
