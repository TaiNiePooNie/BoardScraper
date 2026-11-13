"use client";
import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import type { BoardProfile, CurrencyCode, WaistClass } from "@/lib/types";
import { DEFAULT_FILTERS, type DealFilters, type facets } from "@/lib/filters";

type Facets = ReturnType<typeof facets>;

function Multi<T extends string | number>({ label, options, value, onChange, render = String }: { label: string; options: T[]; value: T[]; onChange: (v: T[]) => void; render?: (v: T) => string }) {
  if (!options.length) return null;
  const toggle = (o: T) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={String(o)} type="button" onClick={() => toggle(o)} aria-pressed={value.includes(o)}
            className={clsx("chip capitalize", value.includes(o) ? "border-glacier bg-glacier/15" : "border-slate-300 hover:border-slate-400 dark:border-slate-700")}>
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterPanel({ value, onChange, facets, currency, wideLocked }: { value: DealFilters; onChange: (f: DealFilters) => void; facets: Facets; currency: CurrencyCode; wideLocked: boolean }) {
  const set = <K extends keyof DealFilters>(k: K, v: DealFilters[K]) => onChange({ ...value, [k]: v });
  return (
    <aside className="panel flex flex-col gap-5 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Filters</h2>
        <button onClick={() => onChange(DEFAULT_FILTERS)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-glacier"><RotateCcw className="h-3 w-3" />Reset</button>
      </div>

      <input className="input" placeholder="Search brand, model, shop…" value={value.query} onChange={(e) => set("query", e.target.value)} />

      <label className="text-sm">
        <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-500"><span>Min. price drop</span><span>{value.minDiscountPct}%</span></div>
        <input type="range" min={0} max={70} step={5} value={value.minDiscountPct} onChange={(e) => set("minDiscountPct", Number(e.target.value))} className="w-full accent-glacier" />
      </label>

      <label className="text-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Max total incl. shipping ({currency})</div>
        <input className="input mt-1" type="number" min={0} placeholder="Any" value={value.maxTotal ?? ""} onChange={(e) => set("maxTotal", e.target.value ? Number(e.target.value) : null)} />
      </label>

      <div className="text-sm">
        <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-500"><span>Flex</span><span>{value.flex[0]}–{value.flex[1]}</span></div>
        <div className="flex gap-2">
          <input type="range" min={1} max={10} value={value.flex[0]} onChange={(e) => set("flex", [Math.min(Number(e.target.value), value.flex[1]), value.flex[1]])} className="w-full accent-glacier" aria-label="Min flex" />
          <input type="range" min={1} max={10} value={value.flex[1]} onChange={(e) => set("flex", [value.flex[0], Math.max(Number(e.target.value), value.flex[0])])} className="w-full accent-glacier" aria-label="Max flex" />
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Waist</div>
        {wideLocked ? (
          <p className="text-xs text-slate-500">Locked to <b>Wide</b> — your boot size requires it.</p>
        ) : (
          <select className="input" value={value.waist} onChange={(e) => set("waist", e.target.value as WaistClass | "any")}>
            <option value="any">Any</option><option value="regular">Regular</option><option value="mid-wide">Mid-wide</option><option value="wide">Wide</option>
          </select>
        )}
      </div>

      <Multi label="Length (cm)" options={facets.lengths} value={value.lengths} onChange={(v) => set("lengths", v)} />
      <Multi label="Profile" options={facets.profiles as BoardProfile[]} value={value.profiles} onChange={(v) => set("profiles", v)} render={(p) => p.replace("-", " ")} />
      <Multi label="Brand" options={facets.brands} value={value.brands} onChange={(v) => set("brands", v)} />
      <Multi label="Pro rider" options={facets.riders} value={value.riders} onChange={(v) => set("riders", v)} />
      <Multi label="Retailer" options={facets.retailers.map(([id]) => id)} value={value.retailers} onChange={(v) => set("retailers", v)} render={(id) => facets.retailers.find(([x]) => x === id)?.[1] ?? id} />

      <label className="text-sm">
        <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-500"><span>Min rating</span><span>{value.minRating || "Any"}</span></div>
        <input type="range" min={0} max={5} step={0.5} value={value.minRating} onChange={(e) => set("minRating", Number(e.target.value))} className="w-full accent-glacier" />
      </label>
    </aside>
  );
}
