"use client";
import { useMemo } from "react";
import { ASSETS } from "@/lib/assets";
import { salesFor } from "@/lib/sales";
import { SPORT_SHORT, type Product } from "@/lib/store";
import type { Sport } from "@/lib/types";
import { formatMoney } from "@/lib/pricing/currency";
import { FitWord, SidewaysBoard, useIsWide } from "./look";

/** "Black Friday · 8 days" / "Black Friday on now", from the sale calendar. */
export function useSaleLine(country: string, sport: Sport): string | null {
  return useMemo(() => {
    const { active, upcoming } = salesFor(new Date(), country, sport, 45);
    if (active[0]) return `${active[0].name} on now`;
    const n = upcoming[0];
    return n ? `${n.name} · ${n.inDays === 1 ? "tomorrow" : `${n.inDays} days`}` : null;
  }, [country, sport]);
}

/**
 * Shop band: counts + sale line, the sport as a giant word and today's best deal lying
 * across it. The band continues into the page (cream) under the board.
 */
export function ShopHero({ sport, count, onSale, country, best, onOpen, plural }: {
  sport: Sport;
  count: number | null;
  onSale: number;
  country: string;
  best: Product | null;
  onOpen: (id: string) => void;
  plural: string;
}) {
  const sale = useSaleLine(country, sport);
  const wide = useIsWide();
  return (
    <section aria-label={`${SPORT_SHORT[sport]} boards`}>
      <div className="bg-deep text-word">
        <div className="app-gutter mx-auto max-w-7xl pt-3">
          <div className="eyebrow flex justify-between gap-4">
            <span>{count === null ? "Checking the shops…" : `${count.toLocaleString("en")} ${plural} · ${onSale.toLocaleString("en")} on sale`}</span>
            {sale && <span className="text-right">{sale}</span>}
          </div>
          <FitWord as="h1" max={wide ? 190 : 300} className="mt-3">{SPORT_SHORT[sport]}</FitWord>
        </div>
      </div>
      <div style={{ background: "linear-gradient(var(--color-deep) 0 60%, var(--color-cream) 60%)" }}>
        <div className="app-gutter mx-auto max-w-7xl pb-1">
          {best ? (
            <button type="button" onClick={() => onOpen(best.id)} className="block w-full rounded-card" aria-label={`Best deal today: ${best.board.brand} ${best.board.model}`}>
              <SidewaysBoard src={best.board.images[0] ?? ""} cutout={best.board.cutout} alt="" placeholder={ASSETS.placeholder[sport]} maxHeight={wide ? 170 : 112} className="-mt-5 md:-mt-16" eager />
            </button>
          ) : <div className="h-24" />}
        </div>
      </div>
      {best && (
        <div className="app-gutter mx-auto max-w-7xl">
          <button type="button" onClick={() => onOpen(best.id)} className="mt-2 flex w-full items-end justify-between gap-3 rounded-control text-left">
            <span className="min-w-0">
              <span className="label block">Best deal today</span>
              <span className="mt-0.5 block truncate text-md font-bold">{best.board.brand} {best.board.model}</span>
            </span>
            <span className="shrink-0 text-right">
              {best.discountPct > 0 ? (
                <span className="block font-display text-3xl font-black leading-none tracking-tight text-sale">−{Math.round(best.discountPct * 100)}%</span>
              ) : null}
              <span className="label mt-1 block">now {formatMoney(best.total, best.currency)}</span>
            </span>
          </button>
        </div>
      )}
    </section>
  );
}
