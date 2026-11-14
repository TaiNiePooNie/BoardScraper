"use client";
import clsx from "clsx";
import type { Budget } from "@/lib/offers";
import { formatMoney } from "@/lib/pricing/currency";
import type { CurrencyCode } from "@/lib/types";

const MAX = 1500;
const STEP = 25;

/** Two-handle budget slider (delivered price) with quick presets and "no limit". */
export function BudgetRange({ value, onChange, currency }: { value: Budget; onChange: (b: Budget) => void; currency: CurrencyCode }) {
  const lo = value.min ?? 0;
  const hi = value.max ?? MAX;
  const noMax = value.max === null;
  const fmt = (n: number) => formatMoney(n, currency);
  const set = (min: number, max: number | null) => onChange({ min: min > 0 ? min : null, max });
  const presets: Array<[string, number | null]> = [[fmt(300), 300], [fmt(500), 500], [fmt(800), 800], ["No limit", null]];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-center gap-2">
        <span className="headline text-4xl tabular-nums">{lo > 0 ? fmt(lo) : fmt(0)}</span>
        <span className="text-paper/50">to</span>
        <span className="headline text-4xl tabular-nums text-acid">{noMax ? "No limit" : fmt(hi)}</span>
      </div>
      <div className="bb-dual">
        <div className="absolute inset-x-0 top-1/2 h-[10px] -translate-y-1/2 rounded-full border-2 border-asphalt bg-paper/15" />
        <div
          className="absolute top-1/2 h-[10px] -translate-y-1/2 rounded-full bg-acid"
          style={{ left: `${(lo / MAX) * 100}%`, right: `${100 - (hi / MAX) * 100}%` }}
        />
        <input id="budget-min" aria-label="Minimum budget" type="range" className="bb-range" min={0} max={MAX} step={STEP} value={lo}
          onChange={(e) => set(Math.min(Number(e.target.value), hi - STEP), value.max)} />
        <input id="budget-max" aria-label="Maximum budget" type="range" className="bb-range" min={0} max={MAX} step={STEP} value={hi}
          onChange={(e) => { const v = Math.max(Number(e.target.value), lo + STEP); set(lo, v >= MAX ? null : v); }} />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {presets.map(([label, max]) => (
          <button key={label} type="button" onClick={() => set(lo, max)}
            className={clsx("rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition", value.max === max ? "border-acid bg-acid text-asphalt" : "border-paper/25 text-paper hover:border-paper/60")}>
            {label === "No limit" ? label : `Up to ${label}`}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-paper/55">Delivered price: board + shipping + VAT and import costs to your country.</p>
    </div>
  );
}
