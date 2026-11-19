import { describe, expect, it } from "vitest";
import { removeBackground } from "./cutout";

/** W×H light-grey canvas with a dark rectangle (the "board") in the middle. */
function photo(W: number, H: number, bg = [230, 230, 230]) {
  const d = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const board = x >= 4 && x < W - 4 && y >= 2 && y < H - 2;
    const c = board ? [40, 90, 160] : bg;
    d.set([...c, 255], i);
  }
  return d;
}
const alpha = (d: Uint8Array, W: number, x: number, y: number) => d[(y * W + x) * 4 + 3];

describe("photo cut-out", () => {
  it("makes the studio background transparent and keeps the board", () => {
    const W = 12, H = 20, d = photo(W, H);
    const cleared = removeBackground(d, W, H);
    expect(alpha(d, W, 0, 0)).toBe(0);
    expect(alpha(d, W, 1, 10)).toBe(0);
    expect(alpha(d, W, 6, 10)).toBe(255);
    expect(cleared).toBeGreaterThan(0.3);
  });
  it("leaves photos on a dark or colourful background alone", () => {
    const W = 12, H = 20, d = photo(W, H, [30, 120, 60]);
    expect(removeBackground(d, W, H)).toBe(0);
    expect(alpha(d, W, 0, 0)).toBe(255);
  });
});
