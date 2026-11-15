import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { feedback, feedbackMedia } from "@/db/schema";
import { serverDb } from "@/db/server";
import { sessionUser } from "@/lib/auth";
import { FEEDBACK_LIMITS, FeedbackInput } from "@/lib/feedback";
import { ipHash, ownerUser, uploadToken } from "@/lib/feedback-server";

export const dynamic = "force-dynamic";

/** Send a feedback / support message. Returns an upload token for attachments. */
export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Feedback isn't available here." }, { status: 503 });
  const parsed = FeedbackInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
  const input = parsed.data;
  // Honeypot filled in: act normal, store nothing.
  if (input.website) return NextResponse.json({ id: 0, token: "" });

  const db = serverDb();
  const ip = ipHash(req.headers);
  if (ip) {
    const [{ n }] = await db.select({ n: count() }).from(feedback).where(and(eq(feedback.ipHash, ip), gte(feedback.createdAt, new Date(Date.now() - 3_600_000))));
    if (n >= FEEDBACK_LIMITS.perHour) return NextResponse.json({ error: "That's a lot of messages! Please wait an hour and try again." }, { status: 429 });
  }
  const user = await sessionUser(req.headers).catch(() => null);
  const [row] = await db.insert(feedback).values({
    kind: input.kind,
    subject: input.subject,
    message: input.message,
    email: input.email || user?.email || null,
    userId: user?.id ?? null,
    context: input.context ?? null,
    ipHash: ip,
  }).returning({ id: feedback.id });
  return NextResponse.json({ id: row.id, token: uploadToken(row.id) });
}

/** Owner inbox: latest messages with attachment info. */
export async function GET(req: Request) {
  if (!(await ownerUser(req.headers))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const db = serverDb();
  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(200);
  const media = rows.length
    ? await db.select({ id: feedbackMedia.id, feedbackId: feedbackMedia.feedbackId, filename: feedbackMedia.filename, mime: feedbackMedia.mime, size: feedbackMedia.size })
        .from(feedbackMedia).where(inArray(feedbackMedia.feedbackId, rows.map((r) => r.id)))
    : [];
  return NextResponse.json({
    items: rows.map((r) => ({ ...r, ipHash: undefined, media: media.filter((m) => m.feedbackId === r.id) })),
  });
}
