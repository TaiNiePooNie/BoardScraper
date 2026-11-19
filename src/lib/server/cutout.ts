/**
 * Clean product photo: turns a plain studio background (light grey, off-white) pure white
 * and trims it, so the photo sits seamlessly on a white card or blends into a light tile
 * (mix-blend-multiply). Flood-fills from the image edges through pixels close to the
 * corner colour, with a soft edge. Turning the background white (instead of transparent)
 * means a mistake is invisible: a white board on a white background just stays white.
 * Photos on a busy or dark background are left alone.
 * Server only (sharp): used by /api/img and the static build.
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

/** sharp pipeline → WebP with the studio background turned white and trimmed off. */
export async function cleanPhotoWebp(img: Sharp, height: number): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  // Work at the output size: the fill is O(pixels).
  const { data, info } = await img
    .flatten({ background: "#ffffff" })
    .resize({ height, width: Math.round(height * 1.4), fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  removeBackground(data, info.width, info.height);
  // Crop to what is left (sharp's own trim runs before flatten, so do it here).
  const box = opaqueBox(data, info.width, info.height);
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(box)
    .flatten({ background: "#ffffff" })
    .webp({ quality: 78 })
    .toBuffer();
}

/** Bounding box of the visible pixels (alpha > 16), with a 2px margin; the whole image if none. */
export function opaqueBox(data: Uint8Array | Buffer, W: number, H: number) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { left: 0, top: 0, width: W, height: H };
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 2);
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}
