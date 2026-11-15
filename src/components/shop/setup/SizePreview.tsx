"use client";
import { useEffect, useRef, useState } from "react";
import { ASSETS } from "@/lib/assets";
import type { FitPreference, Sport } from "@/lib/types";

/**
 * Buddy holding the recommended board, driven by the sliders like a flipbook.
 *
 * Sheets (CHATGPT_CALL_size-preview-buddy.md, CHATGPT_CALL_store-v3.md):
 *  snow  preview-buddy-{persona}-{build}.webp        10 frames, value = board ÷ rider height
 *  surf  preview-buddy-surf-{persona}-{build}.webp   10 frames, value = board length ÷ rider height
 *  skate preview-buddy-skate-{persona}-{build}.webp   8 frames, value = deck width (in)
 * Frames are 300×600. The value picks a fractional frame (two nearest crossfade);
 * weight-to-height picks a fractional build (two nearest crossfade); height scales the figure.
 * Until a sport's sheets exist it shows a simple fallback.
 */
export const RATIOS = [0.5, 0.58, 0.66, 0.73, 0.8, 0.86, 0.91, 0.97, 1.05, 1.15];
export const SURF_RATIOS = [0.95, 1.03, 1.1, 1.17, 1.24, 1.31, 1.38, 1.47, 1.56, 1.65];
export const SKATE_WIDTHS = [7.0, 7.5, 7.75, 8.0, 8.25, 8.5, 9.0, 10.0];
const BUILDS = ["slim", "regular", "broad"] as const;
type Build = (typeof BUILDS)[number];
type Persona = "man" | "woman" | "kid";

const SHEET: Record<Sport, { prefix: string; stops: number[] }> = {
  snow: { prefix: "preview-buddy-", stops: RATIOS },
  surf: { prefix: "preview-buddy-surf-", stops: SURF_RATIOS },
  skate: { prefix: "preview-buddy-skate-", stops: SKATE_WIDTHS },
};

const inlined = () => (globalThis as { __BB_ASSETS?: Record<string, string> }).__BB_ASSETS;
const sheetUrl = (sport: Sport, p: Persona, b: Build) => {
  const f = `${SHEET[sport].prefix}${p}-${b}.webp`;
  return inlined()?.[f] ?? `/assets/${f}`;
};

/** Fractional index of `v` along ascending `stops` (piecewise linear, clamped). */
export function stopIndex(v: number, stops: number[]): number {
  if (v <= stops[0]) return 0;
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i]) return i - 1 + (v - stops[i - 1]) / (stops[i] - stops[i - 1]);
  }
  return stops.length - 1;
}
export const frameFor = (ratio: number) => stopIndex(ratio, RATIOS);

/** Fractional build 0 (slim) … 2 (broad) from BMI; kids have lower thresholds. */
export function buildFor(heightCm: number, weightKg: number, kid: boolean): number {
  const bmi = weightKg / (heightCm / 100) ** 2;
  const [lo, mid, hi] = kid ? [14, 17, 21] : [19, 23, 29];
  if (bmi <= lo) return 0;
  if (bmi <= mid) return (bmi - lo) / (mid - lo);
  if (bmi <= hi) return 1 + (bmi - mid) / (hi - mid);
  return 2;
}

const ready: Partial<Record<Sport, Promise<boolean>>> = {};
function checkSheets(sport: Sport): Promise<boolean> {
  return (ready[sport] ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = sheetUrl(sport, "man", "regular");
  }));
}

const MAX_RIDER_CM = 210;

export function SizePreview({ sport = "snow", heightCm, weightKg, value, badge, fit }: {
  sport?: Sport;
  heightCm: number;
  weightKg: number;
  /** snow/surf: board length ÷ rider height · skate: deck width in inches */
  value: number;
  /** Size label shown in the corner, e.g. "156 cm". */
  badge: string;
  fit: FitPreference;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [boxH, setBoxH] = useState(200);
  const [has, setHas] = useState<boolean | null>(null);

  useEffect(() => {
    setHas(null);
    checkSheets(sport).then(setHas);
  }, [sport]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxH(Math.max(100, e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const kid = fit === "kids";
  const persona: Persona = kid ? "kid" : fit === "womens" ? "woman" : "man";
  const scale = sport === "skate" ? (kid ? 0.82 : 1) : Math.min(1, heightCm / MAX_RIDER_CM);
  const frames = SHEET[sport].stops.length;

  return (
    <div ref={box} className="relative flex h-full min-h-[100px] w-full items-end justify-center" role="img" aria-label={`Buddy with a ${badge} board`}>
      <div className="absolute inset-x-0 bottom-0 h-px bg-line" />
      <span className="absolute right-0 top-0 rounded-full bg-acid px-2 py-0.5 text-sm font-bold text-ink">{badge}</span>
      {has ? (
        <BuddySprite sport={sport} persona={persona} frame={stopIndex(value, SHEET[sport].stops)} frames={frames} build={buildFor(heightCm, weightKg, kid)} frameH={boxH * scale} />
      ) : has === false ? (
        <Fallback sport={sport} boxH={boxH} scale={scale} value={value} persona={persona} heightCm={heightCm} weightKg={weightKg} kid={kid} />
      ) : null}
    </div>
  );
}

/** 4-layer bilinear crossfade: nearest two frames × nearest two builds. */
function BuddySprite({ sport, persona, frame, frames, build, frameH }: { sport: Sport; persona: Persona; frame: number; frames: number; build: number; frameH: number }) {
  const f0 = Math.floor(frame);
  const f1 = Math.min(frames - 1, f0 + 1);
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
  return (
    <div className="relative transition-[height,width] duration-150 ease-out" style={{ height: frameH, width: frameH / 2 }}>
      {layers.map((l, i) =>
        l.w > 0.001 ? (
          <div
            key={i}
            aria-hidden
            className="absolute inset-0 bg-no-repeat transition-opacity duration-100"
            style={{
              backgroundImage: `url(${sheetUrl(sport, persona, BUILDS[l.b])})`,
              backgroundSize: `${frames * 100}% 100%`,
              backgroundPosition: `${(l.f / (frames - 1)) * 100}% 0`,
              opacity: l.w,
            }}
          />
        ) : null,
      )}
    </div>
  );
}

/** Until a sport's sprites exist: snow uses the v2 rider figure + board; skate/surf a simple to-scale board. */
function Fallback({ sport, boxH, scale, value, persona, heightCm, weightKg, kid }: { sport: Sport; boxH: number; scale: number; value: number; persona: Persona; heightCm: number; weightKg: number; kid: boolean }) {
  const b = BUILDS[Math.round(buildFor(heightCm, weightKg, kid))];
  const riderPx = boxH * 0.94 * scale;
  if (sport === "skate") {
    const w = Math.min(boxH * 0.5, value * 9 * scale);
    return (
      <div className="mb-[18%] flex flex-col items-center gap-2">
        <div className="rounded-full border-2 border-ink bg-acid" style={{ width: w, height: boxH * 0.6 * scale }} />
        <span className="text-xs font-semibold text-muted">{value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}″ wide</span>
      </div>
    );
  }
  const boardPx = (sport === "surf" ? Math.min(value, 1.7) : value) * riderPx;
  return (
    <div className="flex items-end gap-2">
      <img src={ASSETS.rider[persona][b]} alt="" className="w-auto transition-[height] duration-150" style={{ height: riderPx }} />
      {sport === "surf" ? (
        <div className="rounded-t-full rounded-b-[40%] border-2 border-ink bg-ice transition-[height] duration-150" style={{ height: Math.min(boxH, boardPx), width: Math.min(boxH, boardPx) * 0.2 }} />
      ) : (
        <img src={ASSETS.previewBoard} alt="" className="transition-[height] duration-150" style={{ height: boardPx, width: boardPx * (80 / 600) }} />
      )}
    </div>
  );
}
