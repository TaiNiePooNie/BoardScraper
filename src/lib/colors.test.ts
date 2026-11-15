import { describe, expect, it } from "vitest";
import { classifyPixels, colorOf } from "./colors";

const img = (w: number, h: number, paint: (x: number, y: number) => [number, number, number]) => {
  const d = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(paint(x, y), (y * w + x) * 3);
  return d;
};

describe("board colours", () => {
  it("names plain colours", () => {
    expect(colorOf(20, 20, 24)).toBe("black");
    expect(colorOf(250, 250, 247)).toBe("white");
    expect(colorOf(150, 150, 155)).toBe("grey");
    expect(colorOf(220, 30, 40)).toBe("red");
    expect(colorOf(255, 122, 26)).toBe("orange");
    expect(colorOf(212, 255, 58)).toBe("yellow");
    expect(colorOf(40, 170, 80)).toBe("green");
    expect(colorOf(47, 111, 237)).toBe("blue");
    expect(colorOf(124, 77, 219)).toBe("purple");
    expect(colorOf(255, 61, 139)).toBe("pink");
    expect(colorOf(176, 122, 74)).toBe("brown");
  });
  it("ignores the backdrop and returns the board's main colours, biggest first", () => {
    // white backdrop, board in the middle: top 2/3 blue, bottom 1/3 black
    const d = img(64, 64, (x, y) => (x < 24 || x >= 40 ? [255, 255, 255] : y < 42 ? [47, 111, 237] : [15, 15, 18]));
    expect(classifyPixels(d, 64, 64, 3)).toEqual(["blue", "black"]);
  });
  it("small accents are left out; a white board on white is white", () => {
    const d = img(64, 64, (x, y) => (x < 24 || x >= 40 ? [240, 240, 240] : y < 4 ? [220, 30, 40] : [40, 170, 80]));
    expect(classifyPixels(d, 64, 64, 3)).toEqual(["green"]);
    expect(classifyPixels(img(64, 64, () => [255, 255, 255]), 64, 64, 3)).toEqual(["white"]);
  });
});
