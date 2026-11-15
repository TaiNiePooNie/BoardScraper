/**
 * Read each board's main colours from its product photo (once per board) and store
 * them for the colour filter. Runs after the daily scrape:
 *
 *   npm run colors [-- --limit=4000]
 *
 * One small image request per board, a few at a time per host; failures are retried
 * on a later run (stored as an empty list after the photo was read without a result).
 */
import { eq, isNull, sql } from "drizzle-orm";
import { openDb } from "@/db/client";
import { boards, listings } from "@/db/schema";
import { classifyPixels } from "@/lib/colors";

const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 4000);
const CONCURRENCY = 6;

/** Ask image CDNs for a small version where we know how (saves their bandwidth and ours). */
function small(url: string): string {
  try {
    const u = new URL(url.startsWith("//") ? `https:${url}` : url);
    if (u.hostname === "cdn.shopify.com") u.searchParams.set("width", "200");
    return u.toString();
  } catch {
    return url;
  }
}

async function analyse(url: string): Promise<string[] | null> {
  const res = await fetch(small(url), { headers: { "user-agent": "BoardBuddy/1.0 (colour index)" }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).resize(64, 64, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return classifyPixels(data, info.width, info.height, 4);
}

async function main() {
  const h = await openDb();
  const rows = await h.db
    .select({ id: boards.id, images: boards.images, listingImage: sql<string | null>`(select ${listings.images}[1] from ${listings} where ${listings.boardId} = ${boards.id} and ${listings.active} limit 1)` })
    .from(boards).where(isNull(boards.colors)).limit(limit);
  let done = 0, failed = 0;
  const queue = [...rows];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      const url = r.images[0] ?? r.listingImage;
      if (!url) continue;
      try {
        const colors = await analyse(url);
        if (colors) { await h.db.update(boards).set({ colors }).where(eq(boards.id, r.id)); done++; } else failed++;
      } catch {
        failed++;
      }
    }
  }));
  console.log(`Colours: ${done} boards analysed, ${failed} failed, ${rows.length - done - failed} without a photo.`);
  await h.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
