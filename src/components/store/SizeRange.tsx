"use client";
import { TriangleAlert } from "lucide-react";
import { fmtFeet, fmtLengthRange, fmtRange, fmtSize, rangeWarning, sizeBounds, type SportFit } from "@/lib/sizing";

const WHY: Record<SportFit["sport"] | "surfLength", { below: string; above: string; what: string }> = {
  snow: { below: "Shorter boards feel less stable at speed and sink in powder.", above: "Longer boards are harder to turn and to control at low speed.", what: "length" },
  skate: { below: "Narrower decks feel less stable under bigger feet.", above: "Wider decks are heavier and harder to flip.", what: "width" },
  surf: { below: "Less volume makes paddling and catching waves harder.", above: "More volume makes the board harder to turn and duck-dive.", what: "volume" },
  surfLength: { below: "Shorter boards paddle slower and catch fewer waves.", above: "Longer boards are harder to turn and carry.", what: "length" },
};

interface Dim {
  key: keyof typeof WHY;
  title: string;
  range: [number, number];
  recommended: [number, number];
  custom: boolean;
  bounds: { min: number; max: number; step: number };
  fmt: (n: number) => string;
  fmtRange: (r: [number, number]) => string;
}

/**
 * Two-handle size range. The green band is the best range for the rider; the dark
 * bar is what they picked. Straying outside the band shows a quiet hint, never a block.
 */
function RangePicker({ d, onChange }: { d: Dim; onChange: (range: [number, number] | null) => void }) {
  const { min, max, step } = d.bounds;
  const clamp = (v: number) => Math.max(min, Math.min(v, max));
  const lo = clamp(d.range[0]);
  const hi = clamp(d.range[1]);
  const pct = (v: number) => `${((clamp(v) - min) / (max - min)) * 100}%`;
  const width = (a: number, b: number) => `calc(${pct(b)} - ${pct(a)})`;
  const eps = step / 2;
  const below = d.custom && d.range[0] < d.recommended[0] - eps;
  const above = d.custom && d.range[1] > d.recommended[1] + eps;
  const set = (a: number, b: number) => onChange([Math.min(a, b), Math.max(a, b)]);
  const why = WHY[d.key];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{d.title}</p>
        <p className="text-sm font-bold tabular-nums">{d.fmtRange(d.range)}</p>
      </div>
      <div className="bb-dual relative mt-1" style={{ height: 36 }}>
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
        <div className="pointer-events-none absolute top-1/2 h-3.5 -translate-y-1/2 rounded-full bg-ok/25 ring-1 ring-ok/40" style={{ left: pct(d.recommended[0]), width: width(d.recommended[0], d.recommended[1]) }} />
        <div className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink" style={{ left: pct(lo), width: width(lo, hi) }} />
        <input type="range" className="bb-range" min={min} max={max} step={step} value={lo} aria-label={`Smallest ${why.what}`}
          aria-valuetext={d.fmt(lo)} onChange={(e) => set(Math.min(Number(e.target.value), hi), hi)} />
        <input type="range" className="bb-range" min={min} max={max} step={step} value={hi} aria-label={`Largest ${why.what}`}
          aria-valuetext={d.fmt(hi)} onChange={(e) => set(lo, Math.max(Number(e.target.value), lo))} />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-ok"><span className="h-2.5 w-4 rounded-full bg-ok/25 ring-1 ring-ok/40" />Best for you: {d.fmtRange(d.recommended)}</span>
        {d.custom && <button type="button" onClick={() => onChange(null)} className="font-semibold underline underline-offset-2">Use best range</button>}
      </div>
      {(below || above) && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-[#fff6e5] px-3 py-2 text-xs text-[#8a5a00]" role="status">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>This range may not suit you. {below && why.below} {above && why.above}</span>
        </p>
      )}
    </div>
  );
}

const cmAndFeet = (cm: number) => `${fmtFeet(cm)} (${Math.round(cm)} cm)`;

/** Size range(s) for the sport: snow length, skate width, surf volume + board length. */
export function SizeRange({ fit, onChange, onLengthChange }: {
  fit: SportFit;
  onChange: (range: [number, number] | null) => void;
  /** Surf only: board length range in cm. */
  onLengthChange?: (range: [number, number] | null) => void;
}) {
  const main: Dim = {
    key: fit.sport,
    title: fit.sport === "surf" ? "Volume" : fit.sport === "skate" ? "Deck width" : "Board length",
    range: fit.range,
    recommended: fit.recommended,
    custom: fit.custom,
    bounds: sizeBounds({ ...fit, range: fit.recommended }),
    fmt: (n) => fmtSize(fit.sport, n),
    fmtRange: (r) => fmtRange(fit.sport, r),
  };
  void rangeWarning;
  const len = fit.sport === "surf" && fit.lengthRangeCm && fit.lengthRecommendedCm ? fit : null;
  return (
    <div className="flex flex-col gap-4">
      <RangePicker d={main} onChange={onChange} />
      {len && onLengthChange && (
        <RangePicker
          onChange={onLengthChange}
          d={{
            key: "surfLength",
            title: "Board length",
            range: len.lengthCustom ? len.lengthRangeCm! : len.lengthRecommendedCm!,
            recommended: len.lengthRecommendedCm!,
            custom: !!len.lengthCustom,
            // 2.54 cm steps = 1 inch
            bounds: { min: Math.max(120, Math.floor(len.lengthRecommendedCm![0] - 60)), max: Math.min(330, Math.ceil(len.lengthRecommendedCm![1] + 60)), step: 2.54 },
            fmt: cmAndFeet,
            fmtRange: fmtLengthRange,
          }}
        />
      )}
    </div>
  );
}
