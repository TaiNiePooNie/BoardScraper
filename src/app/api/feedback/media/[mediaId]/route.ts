import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { feedbackMedia, feedbackMediaChunks } from "@/db/schema";
import { serverDb } from "@/db/server";
import { ownerUser } from "@/lib/feedback-server";

export const dynamic = "force-dynamic";

/** Owner: view an attachment. */
export async function GET(req: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  if (!(await ownerUser(req.headers))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const mediaId = Number((await params).mediaId);
  const db = serverDb();
  const [m] = await db.select().from(feedbackMedia).where(eq(feedbackMedia.id, mediaId));
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parts = await db.select({ data: feedbackMediaChunks.data }).from(feedbackMediaChunks).where(eq(feedbackMediaChunks.mediaId, mediaId)).orderBy(asc(feedbackMediaChunks.idx));
  const body = Buffer.concat(parts.map((p) => p.data));
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "content-type": m.mime,
      "content-length": String(body.length),
      "content-disposition": `inline; filename="${m.filename.replace(/[^\w.\- ]/g, "_")}"`,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; media-src 'self'",
    },
  });
}
