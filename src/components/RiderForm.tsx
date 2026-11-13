"use client";
import clsx from "clsx";
import { useState } from "react";
import type { RiderInput, RidingStyle } from "@/lib/types";
import { ASSETS } from "@/lib/assets";
import { AssetImg } from "./AssetImg";

const STYLES: { id: RidingStyle; label: string; hint: string }[] = [
  { id: "park", label: "Park", hint: "Jumps, rails, butters" },
  { id: "all-mountain", label: "All-Mountain", hint: "A bit of everything" },
  { id: "freeride", label: "Freeride", hint: "Powder, steeps, speed" },
];

export function RiderForm({ onSubmit, loading }: { onSubmit: (r: RiderInput) => void; loading: boolean }) {
  const [v, setV] = useState<RiderInput>({ weightKg: 75, heightCm: 178, bootSize: 10, bootSystem: "US", style: "all-mountain" });
  const set = <K extends keyof RiderInput>(k: K, val: RiderInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const num = (k: "weightKg" | "heightCm" | "bootSize") => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value));

  return (
    <form className="panel grid gap-4 p-5 md:grid-cols-[repeat(3,minmax(0,1fr))_2fr_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}>
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
      <fieldset className="text-sm font-medium">
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
      <button disabled={loading} className="h-10 rounded-lg bg-glacier px-5 font-semibold text-ink transition hover:brightness-110 disabled:opacity-50">
        {loading ? "Finding…" : "Find deals"}
      </button>
    </form>
  );
}
