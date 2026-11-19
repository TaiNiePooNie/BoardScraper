/**
 * AI cut-outs for the boards in the spotlight: removes the photo background with IS-Net
 * (DIS, Apache-2.0, the rembg "isnet-general-use" export) so the board can float on the
 * board page and the shop band. Runs after each scrape:
 *
 *   npm i --no-save onnxruntime-node   # not a project dependency (big native module)
 *   npm run cutouts [-- --per-sport=150 --max=900]
 *
 * Picks the best-graded active boards per sport, makes cut-outs for those that don't have
 * one for their current photo (~1 s each on a 4-core runner) and keeps at most --max rows,
 * dropping the oldest ones that left the spotlight. The model (~170 MB) is downloaded once
 * to .cache/ (the workflow caches it).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { and, asc, eq, notInArray, sql } from "drizzle-orm";
import { openDb } from "@/db/client";
import { boardCutouts, boards, listings } from "@/db/schema";
import { opaqueBox } from "@/lib/server/cutout";
import { SPORTS } from "@/lib/types";

const arg = (k: string, d: number) => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const PER_SPORT = arg("per-sport", 150);
const MAX = arg("max", 900);
const MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx";
const MODEL = process.env.CUTOUT_MODEL ?? ".cache/isnet-general-use.onnx";
const S = 1024; // model input size
const OUT_H = 1000; // stored cut-out height (px)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ort = any;

async function loadModel(): Promise<{ ort: Ort; session: Ort }> {
  const name = "onnxruntime-node"; // optional: installed by the workflow only
  const ort: Ort = await import(name).catch(() => {
    throw new Error("onnxruntime-node is missing: run `npm i --no-save onnxruntime-node` first.");
  });
  if (!existsSync(MODEL)) {
    console.log(`Downloading the cut-out model to ${MODEL}…`);
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`model download failed (${res.status})`);
    mkdirSync(path.dirname(MODEL), { recursive: true });
    writeFileSync(MODEL, Buffer.from(await res.arrayBuffer()));
  }
  const session = await ort.InferenceSession.create(MODEL, { intraOpNumThreads: 4 });
  return { ort, session };
}

/** Shop photo → transparent WebP of the board, or null when the model finds no clear subject. */
async function cutout(ort: Ort, session: Ort, url: string): Promise<{ image: Buffer; width: number; height: number } | null> {
  const res = await fetch(url.startsWith("//") ? `https:${url}` : url, { headers: { "user-agent": "BoardBuddy/1.0 (photo cut-out)" }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return null;
  const sharp = (await import("sharp")).default;
  const src = sharp(Buffer.from(await res.arrayBuffer())).flatten({ background: "#ffffff" });
  const { data: rgb, info } = await src.clone().resize({ height: OUT_H, width: OUT_H, fit: "inside", withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  const { data: small } = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).resize(S, S, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const x = new Float32Array(3 * S * S);
  for (let i = 0; i < S * S; i++) for (let c = 0; c < 3; c++) x[c * S * S + i] = small[i * 3 + c] / 255 - 0.5;
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", x, [1, 3, S, S]) });
  const pred: Float32Array = out[session.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity;
  for (const v of pred) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (hi - lo < 1e-6) return null;
  const mask = Buffer.alloc(S * S);
  for (let i = 0; i < S * S; i++) mask[i] = Math.round((255 * (pred[i] - lo)) / (hi - lo));
  const alpha = await sharp(mask, { raw: { width: S, height: S, channels: 1 } }).resize(W, H, { fit: "fill" }).extractChannel(0).raw().toBuffer();

  const rgba = Buffer.alloc(W * H * 4);
  let solid = 0;
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2]; rgba[i * 4 + 3] = alpha[i];
    if (alpha[i] > 128) solid++;
  }
  // Sanity: a board covers a fair part of its product photo, but not all of it.
  const share = solid / (W * H);
  if (share < 0.04 || share > 0.92) return null;
  const box = opaqueBox(rgba, W, H);
  const img = sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).extract(box);
  const image = await img.webp({ quality: 80, alphaQuality: 90 }).toBuffer();
  return { image, width: box.width, height: box.height };
}

async function main() {
  const h = await openDb();
  try {
    // The spotlight: per sport, the active boards with the best deal grade.
    const score = sql<number>`max(${listings.score})`;
    const rows = await h.db
      .select({ id: boards.id, sport: boards.sport, images: boards.images, listingImage: sql<string | null>`min(${listings.images}[1])`, score })
      .from(boards)
      .innerJoin(listings, and(eq(listings.boardId, boards.id), eq(listings.active, true)))
      .groupBy(boards.id)
      .orderBy(sql`${score} desc nulls last`);
    const spotlight = SPORTS.flatMap((s) => rows.filter((r) => r.sport === s).slice(0, PER_SPORT));
    const have = new Map((await h.db.select({ boardId: boardCutouts.boardId, sourceUrl: boardCutouts.sourceUrl }).from(boardCutouts)).map((c) => [c.boardId, c.sourceUrl]));
    const todo = spotlight
      .map((r) => ({ id: r.id, url: r.images[0] ?? r.listingImage ?? null }))
      .filter((r): r is { id: number; url: string } => !!r.url && have.get(r.id) !== r.url);
    console.log(`Spotlight ${spotlight.length} boards, ${have.size} cut-outs stored, ${todo.length} to make.`);
    if (todo.length) {
      const { ort, session } = await loadModel();
      let made = 0, skipped = 0;
      const started = Date.now();
      for (const r of todo) {
        try {
          const c = await cutout(ort, session, r.url);
          if (!c) { skipped++; continue; }
          const row = { boardId: r.id, image: c.image, width: c.width, height: c.height, sourceUrl: r.url, createdAt: new Date() };
          await h.db.insert(boardCutouts).values(row).onConflictDoUpdate({ target: boardCutouts.boardId, set: row });
          made++;
        } catch (e) {
          skipped++;
          console.log(`  ✗ board ${r.id}: ${(e as Error).message}`);
        }
      }
      console.log(`Made ${made} cut-outs (${skipped} skipped) in ${Math.round((Date.now() - started) / 1000)}s.`);
    }
    // Keep the table small: drop the oldest cut-outs of boards that left the spotlight.
    const total = (await h.db.select({ n: sql<number>`count(*)::int` }).from(boardCutouts))[0].n;
    if (total > MAX) {
      const keep = spotlight.map((r) => r.id);
      const old = await h.db.select({ id: boardCutouts.boardId }).from(boardCutouts)
        .where(keep.length ? notInArray(boardCutouts.boardId, keep) : undefined)
        .orderBy(asc(boardCutouts.createdAt)).limit(total - MAX);
      for (const o of old) await h.db.delete(boardCutouts).where(eq(boardCutouts.boardId, o.id));
      console.log(`Dropped ${old.length} old cut-outs.`);
    }
  } finally {
    await h.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
