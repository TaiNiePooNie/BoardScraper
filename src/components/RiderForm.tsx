"use client";
import clsx from "clsx";
import { useState } from "react";
import type { CurrencyCode, RiderInput, RidingStyle } from "@/lib/types";
import type { Budget } from "@/lib/offers";
import { ASSETS } from "@/lib/assets";
import { AssetImg } from "./AssetImg";

const STYLES: { id: RidingStyle; label: string; hint: string }[] = [
  { id: "park", label: "Park", hint: "Jumps, rails, butters" },
  { id: "all-mountain", label: "All-Mountain", hint: "A bit of everything" },
  { id: "freeride", label: "Freeride", hint: "Powder, steeps, speed" },
];

const toNum = (s: string) => (s.trim() === "" ? null : Number(s));

export function RiderForm({ onSubmit, loading, currency }: { onSubmit: (r: RiderInput, b: Budget) => void; loading: boolean; currency: CurrencyCode }) {
  const [v, setV] = useState<RiderInput>({ weightKg: 75, heightCm: 178, bootSize: 10, bootSystem: "US", style: "all-mountain" });
  const [budget, setBudget] = useState({ min: "", max: "" });
  const set = <K extends keyof RiderInput>(k: K, val: RiderInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const num = (k: "weightKg" | "heightCm" | "bootSize") => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value));

  return (
    <form
      className="panel grid grid-cols-2 gap-4 p-5 md:grid-cols-4 md:items-end"
      onSubmit={(e) => { e.preventDefault(); onSubmit(v, { min: toNum(budget.min), max: toNum(budget.max) }); }}
    >
      <label className="text-sm font-medium">
        Weight (kg)
        <input className="input mt-1" type="number" min={25} max={160} step={0.5} value={v.weightKg} onChange={num("weightKg")} required />
      </label>
      <label className="text-sm font-medium">
        Height (cm)
        <input className="input mt-1" type="number" min={100} max={230} value={v.heightCm} onChange={num("heightCm")} required />
      </label>
      <label className="text-sm font-medium">
        Boot size
        <div className="mt-1 flex gap-1">
          <input className="input" type="number" min={3} max={52} step={0.5} value={v.bootSize} onChange={num("bootSize")} required />
          <select className="input w-20" value={v.bootSystem} onChange={(e) => set("bootSystem", e.target.value as "US" | "EU")}>
            <option>US</option>
            <option>EU</option>
          </select>
        </div>
      </label>
      <label className="text-sm font-medium">
        Budget ({currency}, delivered)
        <div className="mt-1 flex items-center gap-1">
          <input id="budget-min" className="input" type="number" min={0} step={10} placeholder="Min" value={budget.min} onChange={(e) => setBudget((b) => ({ ...b, min: e.target.value }))} aria-label="Minimum budget" />
          <span className="text-slate-400">–</span>
          <input id="budget-max" className="input" type="number" min={0} step={10} placeholder="e.g. 500" value={budget.max} onChange={(e) => setBudget((b) => ({ ...b, max: e.target.value }))} aria-label="Maximum budget" />
        </div>
      </label>
      <fieldset className="col-span-2 text-sm font-medium md:col-span-3">
        <legend>Riding style</legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => set("style", s.id)}
              className={clsx(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition",
                v.style === s.id ? "border-glacier bg-glacier/10" : "border-slate-300 hover:border-slate-400 dark:border-slate-700",
              )}
              aria-pressed={v.style === s.id}
            >
              <AssetImg src={ASSETS.styleIcon[s.id]} alt="" className="h-7 w-7 shrink-0" />
              <span>
                <span className="block font-semibold">{s.label}</span>
                <span className="block text-xs font-normal text-slate-500">{s.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <button disabled={loading} className="col-span-2 h-10 rounded-lg md:col-span-1 bg-glacier px-5 font-semibold text-ink transition hover:brightness-110 disabled:opacity-50">
        {loading ? "Finding…" : "Find deals"}
      </button>
    </form>
  );
}
