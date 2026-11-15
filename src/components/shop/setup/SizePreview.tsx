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
 * Frames are 300×600. The value picks the nearest frame and weight-to-height the nearest
 * build: one still picture at a time, no blending; height scales the figure.
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

/**
 * Individual stills (CHATGPT_CALL_size-finder-stickers.md): size-{sport}-{persona}-{build}-{1..5}.webp,
 * 600×800, stage 1 = way too small … 5 = way too big. Stage values per sport (same measure as `value`).
 */
const STAGES: Record<Sport, number[]> = {
  snow: [0.55, 0.7, 0.86, 0.98, 1.12],
  surf: [1.0, 1.15, 1.3, 1.47, 1.62],
  skate: [6.75, 7.5, 8.25, 9.0, 10.0],
};
const stillUrl = (sport: Sport, p: Persona, b: Build, stage: number) => {
  const f = `size-${sport}-${p}-${b}-${stage}.webp`;
  return inlined()?.[f] ?? `/assets/${f}`;
};
const nearestStage = (sport: Sport, v: number) => {
  const s = STAGES[sport];
  let best = 0;
  for (let i = 1; i < s.length; i++) if (Math.abs(s[i] - v) < Math.abs(s[best] - v)) best = i;
  return best + 1;
};
const stillsReady: Partial<Record<Sport, Promise<boolean>>> = {};
function checkStills(sport: Sport): Promise<boolean> {
  return (stillsReady[sport] ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = stillUrl(sport, "man", "regular", 3);
  }));
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
  const [boxW, setBoxW] = useState(150);
  const [has, setHas] = useState<boolean | null>(null);
  const [stills, setStills] = useState(false);

  useEffect(() => {
    setHas(null);
    setStills(false);
    let alive = true;
    checkStills(sport).then((ok) => {
      if (!alive) return;
      if (ok) { setStills(true); setHas(true); } else checkSheets(sport).then((x) => alive && setHas(x));
    });
    return () => { alive = false; };
  }, [sport]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => { setBoxH(Math.max(100, e.contentRect.height)); setBoxW(Math.max(80, e.contentRect.width)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const kid = fit === "kids";
  const persona: Persona = kid ? "kid" : fit === "womens" ? "woman" : "man";
  const scale = sport === "skate" ? (kid ? 0.82 : 1) : Math.min(1, heightCm / MAX_RIDER_CM);
  const frames = SHEET[sport].stops.length;

  return (
    <div ref={box} className="relative flex h-full min-h-[100px] w-full items-end justify-center overflow-hidden" role="img" aria-label={`Buddy with a ${badge} board`}>
      <div className="absolute inset-x-0 bottom-0 h-px bg-line" />
      <span className="absolute right-0 top-0 rounded-full bg-acid px-2 py-0.5 text-sm font-bold text-ink">{badge}</span>
      {has && stills ? (
        <Still sport={sport} persona={persona} stage={nearestStage(sport, value)} build={Math.round(buildFor(heightCm, weightKg, kid))} maxW={boxW} maxH={(boxH - 28) * scale} />
      ) : has ? (
        <BuddySprite sport={sport} persona={persona} frame={stopIndex(value, SHEET[sport].stops)} frames={frames} build={buildFor(heightCm, weightKg, kid)} frameH={boxH * scale} />
      ) : has === false ? (
        <Fallback sport={sport} boxH={boxH} scale={scale} value={value} persona={persona} heightCm={heightCm} weightKg={weightKg} kid={kid} />
      ) : null}
    </div>
  );
}

/**
 * Union of every still's visible pixels per sport (600×800 canvases): cropping to this box
 * keeps Buddy and the board aligned and centred, whatever the stage, build or persona.
 */
const STILL_BOX: Record<Sport, { x: number; y: number; w: number; h: number }> = {
  snow: { x: 47, y: 203, w: 458, h: 570 },
  skate: { x: 67, y: 248, w: 413, h: 524 },
  surf: { x: 49, y: 9, w: 528, h: 762 },
};

/** Mascot-style still for the stage + build, cropped to the sport's box and fitted inside the preview. */
function Still({ sport, persona, stage, build, maxW, maxH }: { sport: Sport; persona: Persona; stage: number; build: number; maxW: number; maxH: number }) {
  const box = STILL_BOX[sport];
  const k = Math.min(maxW / box.w, maxH / box.h);
  return (
    <div className="relative overflow-hidden" style={{ width: box.w * k, height: box.h * k }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={stillUrl(sport, persona, BUILDS[Math.max(0, Math.min(2, build))], stage)}
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={{ width: 600 * k, height: 800 * k, left: -box.x * k, top: -box.y * k }}
      />
    </div>
  );
}

/** One still picture: the nearest frame for the size and the nearest build (no blending). */
function BuddySprite({ sport, persona, frame, frames, build, frameH }: { sport: Sport; persona: Persona; frame: number; frames: number; build: number; frameH: number }) {
  const f = Math.max(0, Math.min(frames - 1, Math.round(frame)));
  const b = Math.max(0, Math.min(2, Math.round(build)));
  return (
    <div
      aria-hidden
      className="bg-no-repeat"
      style={{
        height: frameH,
        width: frameH / 2,
        backgroundImage: `url(${sheetUrl(sport, persona, BUILDS[b])})`,
        backgroundSize: `${frames * 100}% 100%`,
        backgroundPosition: `${(f / (frames - 1)) * 100}% 0`,
      }}
    />
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
