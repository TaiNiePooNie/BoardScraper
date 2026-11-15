"use client";
import { TriangleAlert } from "lucide-react";
import { fmtRange, fmtSize, rangeWarning, sizeBounds, type SportFit } from "@/lib/sizing";

const WHY: Record<SportFit["sport"], { below: string; above: string; what: string }> = {
  snow: { below: "Shorter boards feel less stable at speed and sink in powder.", above: "Longer boards are harder to turn and to control at low speed.", what: "length" },
  skate: { below: "Narrower decks feel less stable under bigger feet.", above: "Wider decks are heavier and harder to flip.", what: "width" },
  surf: { below: "Less volume makes paddling and catching waves harder.", above: "More volume makes the board harder to turn and duck-dive.", what: "volume" },
};

/**
 * Two-handle size range. The recommended range is the green band; the dark bar is
 * what the rider picked. Straying outside the band shows a quiet hint, never a block.
 */
export function SizeRange({ fit, onChange }: { fit: SportFit; onChange: (range: [number, number] | null) => void }) {
  // Bounds are fixed while a handle is dragged (keyed to the recommendation only), so the slider never jumps under the finger.
  const { min, max, step } = sizeBounds({ ...fit, range: fit.recommended });
  const lo = Math.max(min, Math.min(fit.range[0], max));
  const hi = Math.max(min, Math.min(fit.range[1], max));
  const pct = (v: number) => `${((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100}%`;
  const width = (a: number, b: number) => `calc(${pct(b)} - ${pct(a)})`;
  const warn = rangeWarning(fit);
  const set = (a: number, b: number) => onChange([Math.min(a, b), Math.max(a, b)]);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Size range</p>
        <p className="text-sm font-bold tabular-nums">{fit.rangeLabel}</p>
      </div>
      <div className="bb-dual relative mt-1" style={{ height: 36 }}>
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
        <div className="pointer-events-none absolute top-1/2 h-3.5 -translate-y-1/2 rounded-full bg-ok/25 ring-1 ring-ok/40" style={{ left: pct(fit.recommended[0]), width: width(fit.recommended[0], fit.recommended[1]) }} />
        <div className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink" style={{ left: pct(lo), width: width(lo, hi) }} />
        <input type="range" className="bb-range" min={min} max={max} step={step} value={lo} aria-label={`Smallest ${WHY[fit.sport].what}`}
          aria-valuetext={fmtSize(fit.sport, lo)} onChange={(e) => set(Math.min(Number(e.target.value), hi), hi)} />
        <input type="range" className="bb-range" min={min} max={max} step={step} value={hi} aria-label={`Largest ${WHY[fit.sport].what}`}
          aria-valuetext={fmtSize(fit.sport, hi)} onChange={(e) => set(lo, Math.max(Number(e.target.value), lo))} />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-ok"><span className="h-2.5 w-4 rounded-full bg-ok/25 ring-1 ring-ok/40" />Best for you: {fmtRange(fit.sport, fit.recommended)}</span>
        {fit.custom && <button type="button" onClick={() => onChange(null)} className="font-semibold underline underline-offset-2">Use best range</button>}
      </div>
      {warn && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-[#fff6e5] px-3 py-2 text-xs text-[#8a5a00]" role="status">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>This range may not suit you. {warn.below && WHY[fit.sport].below} {warn.above && WHY[fit.sport].above}</span>
        </p>
      )}
    </div>
  );
}
