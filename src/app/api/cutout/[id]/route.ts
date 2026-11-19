import { NextResponse } from "next/server";

/** AI cut-out of a board photo (transparent WebP), made by the daily job. Cached for good: the URL carries a version. */
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const [{ getDb }, { boardCutouts }, { eq }] = await Promise.all([import("@/db/client"), import("@/db/schema"), import("drizzle-orm")]);
  const db = await getDb();
  const [row] = await db.select({ image: boardCutouts.image }).from(boardCutouts).where(eq(boardCutouts.boardId, id)).catch(() => []);
  if (!row) return NextResponse.json({ error: "no cut-out" }, { status: 404, headers: { "cache-control": "public, max-age=300" } });
  return new NextResponse(new Uint8Array(row.image), {
    headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" },
  });
}
