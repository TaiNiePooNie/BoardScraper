/**
 * Board colours, read from the product photo: a small fixed palette so they can be
 * filtered. `classifyPixels` is pure (tested); the scrape job feeds it a 64×64 thumbnail.
 */
export const BOARD_COLORS = ["black", "white", "grey", "red", "orange", "yellow", "green", "blue", "purple", "pink", "brown"] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];
export const COLOR_LABEL: Record<BoardColor, string> = { black: "Black", white: "White", grey: "Grey", red: "Red", orange: "Orange", yellow: "Yellow", green: "Green", blue: "Blue", purple: "Purple", pink: "Pink", brown: "Wood / brown" };
export const COLOR_HEX: Record<BoardColor, string> = { black: "#15161a", white: "#ffffff", grey: "#9aa0a6", red: "#e02424", orange: "#ff7a1a", yellow: "#ffd60a", green: "#2fa84f", blue: "#2f6fed", purple: "#7c4ddb", pink: "#ff5fa2", brown: "#b07a4a" };

export function colorOf(r: number, g: number, b: number): BoardColor {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 510;
  const d = max - min;
  const s = d === 0 ? 0 : d / (255 - Math.abs(max + min - 255));
  if (l < 0.16) return "black";
  if (s < 0.14 || d < 22) return l > 0.86 ? "white" : l < 0.3 ? "black" : "grey";
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  // Dark or muted oranges/yellows read as wood and tan.
  if (h >= 12 && h < 50 && (l < 0.45 || s < 0.5)) return "brown";
  if (h < 12 || h >= 345) return "red";
  if (h < 40) return "orange";
  if (h < 78) return "yellow";
  if (h < 165) return "green";
  if (h < 255) return "blue";
  if (h < 290) return "purple";
  return l > 0.45 || h < 330 ? "pink" : "red";
}

/**
 * Main colours of the board in an RGB(A) pixel buffer. The backdrop is taken from the
 * image corners and ignored (also transparent pixels); colours covering ≥ 15 % of the
 * board are returned, biggest first, at most 3.
 */
export function classifyPixels(data: Uint8Array | Uint8ClampedArray, width: number, height: number, channels: 3 | 4): BoardColor[] {
  const px = (x: number, y: number) => { const i = (y * width + x) * channels; return [data[i], data[i + 1], data[i + 2], channels === 4 ? data[i + 3] : 255] as const; };
  const corners = [px(1, 1), px(width - 2, 1), px(1, height - 2), px(width - 2, height - 2)];
  const bg = corners.filter((c) => c[3] > 128);
  const isBg = (r: number, g: number, b: number) => bg.some((c) => Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b) < 54);
  const counts = new Map<BoardColor, number>();
  let total = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const [r, g, b, a] = px(x, y);
    if (a < 128 || isBg(r, g, b)) continue;
    const c = colorOf(r, g, b);
    counts.set(c, (counts.get(c) ?? 0) + 1);
    total++;
  }
  // Board the same colour as the backdrop (white board on white): nothing left to count.
  if (total < width * height * 0.04) return bg.length ? [colorOf(bg[0][0], bg[0][1], bg[0][2])] : [];
  return [...counts.entries()].filter(([, n]) => n / total >= 0.15).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
}
