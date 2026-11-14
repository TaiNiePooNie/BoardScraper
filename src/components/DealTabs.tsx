"use client";
import clsx from "clsx";
import { DEAL_TIERS, type DealTier } from "@/lib/types";
import { TIER_LABELS } from "@/lib/grading";
import { ASSETS } from "@/lib/assets";
import { AssetImg } from "./AssetImg";
import { TIER_STYLES } from "./TierBadge";

export type TabValue = DealTier | "all";

export function DealTabs({ value, onChange, counts }: { value: TabValue; onChange: (t: TabValue) => void; counts: Record<DealTier, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabs: { id: TabValue; label: string; n: number }[] = [
    ...DEAL_TIERS.map((t) => ({ id: t, label: TIER_LABELS[t], n: counts[t] })),
    { id: "all", label: "All", n: total },
  ];
  return (
    <div role="tablist" aria-label="Deal quality" className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={clsx(
              "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition",
              active ? (t.id === "all" ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink" : TIER_STYLES[t.id as DealTier]) : "border-transparent text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800",
            )}
          >
            {t.id !== "all" && <AssetImg src={ASSETS.rank[t.id as DealTier]} alt="" className="h-5 w-5" />}
            {t.label}
            <span className="rounded-full bg-black/5 px-2 text-xs dark:bg-white/10">{t.n}</span>
          </button>
        );
      })}
    </div>
  );
}
