"use client";
import { ExternalLink, History, LineChart, Sparkles, Star, Users } from "lucide-react";
import { useState } from "react";
import { formatMoney } from "@/lib/pricing/currency";
import { effectiveMsrp } from "@/lib/deals";
import { isFullPrice } from "@/lib/grading";
import type { Budget, BoardGroup } from "@/lib/offers";
import { ImageCarousel } from "./ImageCarousel";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { TierBadge } from "./TierBadge";

const cleanName = (n: string) => n.replace(/ \(mock\)$/, "");

/** One card per board: best (cheapest delivered) offer up front, other shops below. */
export function DealCard({ group, budget, rank }: { group: BoardGroup; budget: Budget; rank?: number }) {
  const deal = group.best;
  const { board, listing, retailer, grade, landed, stats } = deal;
  const others = group.offers.slice(1);
  const [showChart, setShowChart] = useState(false);
  const msrpLocal = effectiveMsrp(listing, board);
  const sizes = (deal.matchingSizes.length ? deal.matchingSizes.map((m) => m.size) : listing.sizes).toSorted((a, b) => a.lengthCm - b.lengthCm);

  return (
    <article id={`board-${group.id}`} className="panel flex scroll-mt-4 flex-col gap-3 p-4">
      <ImageCarousel images={board.images} alt={`${board.brand} ${board.model}`} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{board.brand} · {board.season}</div>
          <h3 className="text-lg font-bold leading-tight">{board.model}</h3>
        </div>
        <TierBadge tier={grade.tier} score={grade.score} fullPrice={isFullPrice(grade)} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="chip inline-flex items-center gap-1 border-glacier/40 bg-glacier/10 font-semibold" title="Best-for-you score: style fit, deal quality, reviews and budget">
          <Sparkles className="h-3 w-3" />{rank !== undefined ? `#${rank} · ` : ""}Match {group.value.score}
        </span>
        {group.value.reasons.length > 0 && <span className="text-slate-500">{group.value.reasons.join(" · ")}</span>}
      </div>
      {group.budget === "over" && budget.max !== null && (
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{formatMoney(landed.total - budget.max, landed.currency)} over your budget</p>
      )}

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black">{formatMoney(listing.price.amount, listing.price.currency)}</span>
        {Math.round(grade.discountPct * 100) > 0 && (
          <>
            <span className="text-sm text-slate-500 line-through">{formatMoney(msrpLocal, listing.price.currency)}</span>
            <span className="text-sm font-semibold text-tier-xg">−{Math.round(grade.discountPct * 100)}%</span>
          </>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-slate-500">Delivered total</dt>
        <dd className="text-right font-semibold">{formatMoney(landed.total, landed.currency)}</dd>
        <dt className="text-slate-500">Shipping</dt>
        <dd className="text-right">{landed.shipping ? formatMoney(landed.shipping, landed.currency) : "Free"}</dd>
        <dt className="text-slate-500">VAT {Math.round(landed.vatRate * 1000) / 10}%{landed.vatIncluded ? " (incl.)" : ""}</dt>
        <dd className="text-right">{formatMoney(landed.vat, landed.currency)}</dd>
        {landed.duties > 0 && (<><dt className="text-slate-500">Est. duties</dt><dd className="text-right">{formatMoney(landed.duties, landed.currency)}</dd></>)}
      </dl>
      {landed.notes.length > 0 && <p className="text-[11px] text-slate-500">{landed.notes.join(" · ")}</p>}

      <div className="flex flex-wrap gap-1">
        {board.profile && <span className="chip border-slate-300 capitalize dark:border-slate-700">{board.profile.replace("-", " ")}</span>}
        {board.flex !== null && <span className="chip border-slate-300 dark:border-slate-700">Flex {board.flex}/10</span>}
        {board.shape && <span className="chip border-slate-300 capitalize dark:border-slate-700">{board.shape.replace("-", " ")}</span>}
      </div>
      <div className="flex flex-wrap gap-1">
        {sizes.map((s) => (
          <span key={s.label} className={`chip ${s.waist === "wide" ? "border-glacier/50 bg-glacier/10" : "border-slate-300 dark:border-slate-700"} ${s.inStock ? "" : "opacity-40 line-through"}`}>{s.label}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        {board.reviews ? (
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{board.reviews.average.toFixed(1)} ({board.reviews.count})</span>
        ) : <span>No reviews</span>}
        {board.ambassadors.length > 0 && (
          <span className="flex items-center gap-1" title={board.ambassadors.map((a) => `${a.name} (${a.confidence})`).join(", ")}>
            <Users className="h-3.5 w-3.5" />{board.ambassadors.map((a) => a.name).join(", ")}
          </span>
        )}
      </div>

      {others.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-800">
          <div className="mb-1 font-semibold text-slate-500">Also at</div>
          <ul className="flex flex-col gap-1">
            {others.map((o) => (
              <li key={o.listing.id} className="flex items-center justify-between gap-2">
                <a href={o.listing.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-glacier hover:underline">{cleanName(o.retailer.name)}</a>
                <span className="shrink-0 tabular-nums">{formatMoney(o.landed.total, o.landed.currency)} delivered</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {group.lastSeason && (
        <button
          type="button"
          onClick={() => document.getElementById(`board-${group.lastSeason!.boardId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-2.5 py-2 text-left text-xs text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
        >
          <History className="h-4 w-4 shrink-0" />
          <span>
            Last season ({group.lastSeason.season}): <b>{formatMoney(group.lastSeason.total, group.lastSeason.currency)}</b> at {cleanName(group.lastSeason.retailer)} · {Math.round(group.lastSeason.savingPct * 100)}% less
          </span>
        </button>
      )}

      {showChart && <PriceHistoryChart history={listing.history} msrp={msrpLocal} stats={stats} currency={listing.price.currency} />}

      <div className="mt-auto flex gap-2 pt-1">
        <button onClick={() => setShowChart((s) => !s)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
          <LineChart className="h-4 w-4" />{showChart ? "Hide" : "Price history"}
        </button>
        <a href={listing.url} target="_blank" rel="noopener noreferrer nofollow" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-white dark:text-ink">
          {cleanName(retailer.name)}<ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}
