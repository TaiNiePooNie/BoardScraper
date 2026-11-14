"use client";
import { useEffect, useRef, useState } from "react";
import { ASSETS } from "@/lib/assets";
import type { FitPreference } from "@/lib/types";

/**
 * Buddy holding the recommended board, driven by the sliders like a flipbook.
 *
 * Art: CHATGPT_CALL_size-preview-buddy.md → preview-buddy-{man|woman|kid}-{slim|regular|broad}.webp,
 * each a 10-frame sheet (300×600 per frame). Frame k shows a board of RATIOS[k] × rider height.
 *  - board ÷ rider ratio → fractional frame; the two nearest frames crossfade
 *  - weight-to-height (BMI) → fractional build; the two nearest builds crossfade
 *  - rider height → overall scale (taller rider = bigger Buddy)
 * Until the sheets exist it falls back to the simple figure + board.
 */
export const RATIOS = [0.5, 0.58, 0.66, 0.73, 0.8, 0.86, 0.91, 0.97, 1.05, 1.15];
const BUILDS = ["slim", "regular", "broad"] as const;
type Build = (typeof BUILDS)[number];
type Persona = "man" | "woman" | "kid";

const sheet = (p: Persona, b: Build) => `/assets/preview-buddy-${p}-${b}.webp`;
const inlined = () => (globalThis as { __BB_ASSETS?: Record<string, string> }).__BB_ASSETS;
const sheetUrl = (p: Persona, b: Build) => inlined()?.[`preview-buddy-${p}-${b}.webp`] ?? sheet(p, b);

/** Fractional frame index for a board/rider ratio (piecewise-linear between RATIOS). */
export function frameFor(ratio: number): number {
  if (ratio <= RATIOS[0]) return 0;
  for (let i = 1; i < RATIOS.length; i++) {
    if (ratio <= RATIOS[i]) return i - 1 + (ratio - RATIOS[i - 1]) / (RATIOS[i] - RATIOS[i - 1]);
  }
  return RATIOS.length - 1;
}

/** Fractional build 0 (slim) … 2 (broad) from BMI; kids have lower thresholds. */
export function buildFor(heightCm: number, weightKg: number, kid: boolean): number {
  const bmi = weightKg / (heightCm / 100) ** 2;
  const [lo, mid, hi] = kid ? [14, 17, 21] : [19, 23, 29];
  if (bmi <= lo) return 0;
  if (bmi <= mid) return (bmi - lo) / (mid - lo);
  if (bmi <= hi) return 1 + (bmi - mid) / (hi - mid);
  return 2;
}

/** Do the sprite sheets exist yet? (checked once per page) */
let sheetsReady: Promise<boolean> | null = null;
function checkSheets(): Promise<boolean> {
  sheetsReady ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = sheetUrl("man", "regular");
  });
  return sheetsReady;
}

const MAX_RIDER_CM = 210;

export function SizePreview({ heightCm, weightKg, boardCm, wide, fit }: { heightCm: number; weightKg: number; boardCm: number; wide: boolean; fit: FitPreference }) {
  const box = useRef<HTMLDivElement>(null);
  const [boxH, setBoxH] = useState(200);
  const [hasSprites, setHasSprites] = useState<boolean | null>(null);

  useEffect(() => {
    checkSheets().then(setHasSprites);
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxH(Math.max(100, e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const kid = fit === "kids";
  const persona: Persona = kid ? "kid" : fit === "womens" ? "woman" : "man";
  const label = `Rider ${heightCm} cm next to a ${boardCm}${wide ? " cm wide" : " cm"} board`;
  const scale = Math.min(1, heightCm / MAX_RIDER_CM);

  return (
    <div ref={box} className="relative flex h-full min-h-[100px] w-full items-end justify-center" role="img" aria-label={label}>
      <div className="absolute inset-x-0 bottom-0 h-[2px] rounded bg-paper/25" />
      <span className="headline absolute right-0 top-0 rounded-md bg-acid px-1.5 text-sm text-asphalt">{boardCm}{wide ? "W" : ""} cm</span>
      {hasSprites ? (
        <BuddySprite persona={persona} frame={frameFor(boardCm / heightCm)} build={buildFor(heightCm, weightKg, kid)} frameH={boxH * scale} />
      ) : hasSprites === false ? (
        <Fallback heightCm={heightCm} weightKg={weightKg} boardCm={boardCm} wide={wide} kid={kid} persona={persona} pxPerCm={(boxH * 0.94) / MAX_RIDER_CM} />
      ) : null}
    </div>
  );
}

/** 4-layer bilinear crossfade: nearest two frames × nearest two builds. */
function BuddySprite({ persona, frame, build, frameH }: { persona: Persona; frame: number; build: number; frameH: number }) {
  const f0 = Math.floor(frame);
  const f1 = Math.min(RATIOS.length - 1, f0 + 1);
  const t = frame - f0;
  const b0 = Math.floor(build);
  const b1 = Math.min(2, b0 + 1);
  const u = build - b0;
  const layers = [
    { f: f0, b: b0, w: (1 - t) * (1 - u) },
    { f: f1, b: b0, w: t * (1 - u) },
    { f: f0, b: b1, w: (1 - t) * u },
    { f: f1, b: b1, w: t * u },
  ];
  // Frames are 300×600; the sheet holds 10 across.
  const w = frameH / 2;
  return (
    <div className="relative transition-[height,width] duration-150 ease-out" style={{ height: frameH, width: w }}>
      {layers.map((l, i) =>
        l.w > 0.001 ? (
          <div
            key={i}
            aria-hidden
            className="absolute inset-0 bg-no-repeat transition-opacity duration-100"
            style={{
              backgroundImage: `url(${sheetUrl(persona, BUILDS[l.b])})`,
              backgroundSize: `${RATIOS.length * 100}% 100%`,
              backgroundPosition: `${(l.f / (RATIOS.length - 1)) * 100}% 0`,
              opacity: l.w,
            }}
          />
        ) : null,
      )}
    </div>
  );
}

/** Interim: v2 rider figure + board, scaled to the box. */
function Fallback({ heightCm, weightKg, boardCm, wide, kid, persona, pxPerCm }: { heightCm: number; weightKg: number; boardCm: number; wide: boolean; kid: boolean; persona: Persona; pxPerCm: number }) {
  const b = BUILDS[Math.round(buildFor(heightCm, weightKg, kid))];
  const boardPx = boardCm * pxPerCm;
  return (
    <div className="flex items-end gap-3">
      <img src={ASSETS.rider[persona][b]} alt="" className="w-auto transition-[height] duration-150" style={{ height: heightCm * pxPerCm }} />
      <img src={ASSETS.previewBoard} alt="" className="transition-[height] duration-150" style={{ height: boardPx, width: (wide ? 1.15 : 1) * boardPx * (80 / 600) }} />
    </div>
  );
}
