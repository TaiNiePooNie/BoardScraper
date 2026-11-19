/**
 * Board photo cut-out: removes the plain studio background (white or light grey) around a
 * board so it can float on a coloured backdrop. Flood-fills from the image edges through
 * pixels close to the corner colour, with a soft edge for anti-aliasing. Photos on a busy
 * background barely change (the fill stops at the first non-matching pixel).
 * Server only (sharp): used by /api/img?cut=1 and the static build.
 */
import type { Sharp } from "sharp";

const TOL = 26; // colour distance treated as background
const SOFT = 18; // extra distance faded out for a smooth edge

/** Remove the background in place. `data` is RGBA. Returns how much of the image became transparent (0–1). */
export function removeBackground(data: Uint8Array | Buffer, width: number, height: number): number {
  const W = width, H = height;
  const at = (i: number, k: number) => data[i * 4 + k];
  const corners = [0, W - 1, (H - 1) * W, H * W - 1];
  // Median of the corner colours, so one odd corner (a logo, a shadow) doesn't win.
  const bg = [0, 1, 2].map((k) => corners.map((i) => at(i, k)).sort((a, b) => a - b)[1]);
  // Only light, low-saturation backdrops are studio backgrounds.
  if (Math.min(...bg) < 170 || Math.max(...bg) - Math.min(...bg) > 30) return 0;
  const dist = (i: number) => Math.hypot(at(i, 0) - bg[0], at(i, 1) - bg[1], at(i, 2) - bg[2]);
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  let cleared = 0;
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i]) continue;
    const d = dist(i);
    if (d > TOL + SOFT) continue;
    seen[i] = 1;
    if (data[i * 4 + 3] === 0) { cleared++; } else {
      const a = d <= TOL ? 0 : Math.round((255 * (d - TOL)) / SOFT);
      data[i * 4 + 3] = Math.min(data[i * 4 + 3], a);
      if (a === 0) cleared++;
    }
    if (d > TOL) continue; // soft edge: don't spread past it
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
  smoothEdges(data, W, H);
  return cleared / (W * H);
}

/** 3×3 box blur of the alpha channel along the cut edge, against JPEG-noise jaggies. */
function smoothEdges(data: Uint8Array | Buffer, W: number, H: number) {
  const a = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = data[i * 4 + 3];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      let sum = 0, lo = 255, hi = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const v = a[i + dy * W + dx];
        sum += v; if (v < lo) lo = v; if (v > hi) hi = v;
      }
      if (hi - lo > 0) data[i * 4 + 3] = Math.round(sum / 9);
    }
  }
}

/** sharp pipeline → transparent WebP with the background removed and trimmed to the board. */
export async function cutoutWebp(img: Sharp, height: number): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  // Work at the output size: the fill is O(pixels).
  const { data, info } = await img.resize({ height, width: Math.round(height * 1.4), fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  removeBackground(data, info.width, info.height);
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .webp({ quality: 78, alphaQuality: 90 })
    .toBuffer();
}
