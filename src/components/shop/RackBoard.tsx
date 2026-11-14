"use client";
import { motion } from "motion/react";
import { ASSETS, TIER_RANK } from "@/lib/assets";
import { TIER_LABELS } from "@/lib/grading";
import type { BoardGroup } from "@/lib/offers";
import { formatMoney } from "@/lib/pricing/currency";
import { ProductImg } from "../ProductImg";
import { PriceTag } from "./PriceTag";

export const boardLayoutId = (wallId: string, groupId: string) => `board-${wallId}-${groupId}`;

/** One board hanging on the rack: hook, board on a white sticker card, rank badge and price tag. */
export function RackBoard({ group, wallId, offset, hidden, onSelect, tilt }: {
  group: BoardGroup;
  wallId: string;
  /** -1 / +1 when another board on this rack is picked: slide out of the way. */
  offset: number;
  /** This board is open in the detail view (its card is "off the rack"). */
  hidden: boolean;
  onSelect: () => void;
  tilt: number;
}) {
  const { board, best } = group;
  const name = `${board.brand} ${board.model}`;
  return (
    <motion.div
      className="relative flex w-[104px] shrink-0 snap-start flex-col items-center sm:w-[150px]"
      animate={{ x: offset * 56, opacity: offset ? 0.25 : 1, scale: offset ? 0.94 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <img src={ASSETS.rackHook} alt="" className="relative z-10 h-[28px] w-auto sm:h-[34px]" />
      <button
        type="button"
        onClick={onSelect}
        className="group relative -mt-2 block w-full rounded-[30px] focus-visible:outline-offset-4"
        aria-label={`${name}, ${formatMoney(best.landed.total, best.landed.currency)} delivered, ${TIER_LABELS[group.tier]} deal. Open details`}
      >
        <div className="flex min-h-[120px] w-full items-start justify-center">
          {hidden ? (
            // Same-size invisible stand-in while the board is "off the rack", so nothing jumps.
            <div className="invisible inline-flex max-w-full border-4 p-1" aria-hidden>
              <ProductImg src={board.images[0] ?? ""} alt="" size={440} className="block max-h-[212px] w-auto max-w-full sm:max-h-[322px]" />
            </div>
          ) : (
            <motion.div
              layoutId={boardLayoutId(wallId, group.id)}
              className="relative inline-flex max-h-full max-w-full overflow-hidden rounded-[22px] border-4 border-paper bg-paper shadow-[0_8px_0_rgba(0,0,0,0.4)] transition-transform group-hover:-translate-y-1"
              style={{ rotate: tilt }}
            >
              <ProductImg src={board.images[0] ?? ""} alt="" loading="lazy" size={440} className="block max-h-[212px] w-auto max-w-full object-contain p-1 sm:max-h-[322px]" />
            </motion.div>
          )}
        </div>
        <img src={ASSETS.rank[group.tier]} alt={`Rank ${TIER_RANK[group.tier]}`} className="absolute -left-2 top-2 z-10 h-9 w-9 -rotate-12 drop-shadow sm:h-11 sm:w-11" />
      </button>
      <div className="relative z-10 -mt-3 flex flex-col items-center" style={{ transform: `rotate(${-tilt * 2}deg)` }}>
        <span className="h-4 w-px bg-paper/60" aria-hidden />
        <PriceTag group={group} />
      </div>
      <div className="mt-1 w-full text-center">
        <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-paper/55">{board.brand}</div>
        <div className="headline line-clamp-2 text-base leading-tight text-paper sm:text-lg">{board.model}</div>
      </div>
    </motion.div>
  );
}
