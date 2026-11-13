import clsx from "clsx";
import type { DealTier } from "@/lib/types";
import { TIER_LABELS } from "@/lib/grading";
import { ASSETS } from "@/lib/assets";
import { AssetImg } from "./AssetImg";

export const TIER_STYLES: Record<DealTier, string> = {
  "extremely-good": "bg-tier-xg/15 text-tier-xg border-tier-xg/40",
  "very-good": "bg-tier-vg/15 text-tier-vg border-tier-vg/40",
  good: "bg-tier-g/15 text-tier-g border-tier-g/40",
  normal: "bg-tier-n/15 text-slate-500 border-tier-n/40",
  bad: "bg-tier-b/15 text-tier-b border-tier-b/40",
};

export function TierBadge({ tier, score }: { tier: DealTier; score?: number }) {
  return (
    <span className={clsx("chip inline-flex items-center gap-1.5", TIER_STYLES[tier])}>
      <AssetImg src={ASSETS.tierIcon[tier]} alt="" className="h-4 w-4" />
      {TIER_LABELS[tier]}
      {score !== undefined && <span className="opacity-70">· {score}</span>}
    </span>
  );
}
