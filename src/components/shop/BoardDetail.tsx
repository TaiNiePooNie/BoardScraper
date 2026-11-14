"use client";
import clsx from "clsx";
import { motion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight, ExternalLink, Star, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ASSETS, TIER_RANK } from "@/lib/assets";
import { effectiveMsrp } from "@/lib/deals";
import { flexWord, PROFILE_INFO, PROFILE_PATH, SHAPE_INFO } from "@/lib/explain";
import { isFullPrice, TIER_LABELS } from "@/lib/grading";
import type { BoardGroup, Budget } from "@/lib/offers";
import { formatMoney } from "@/lib/pricing/currency";
import type { Recommendation } from "@/lib/sizing";
import { boardStats, STAT_KEYS, STAT_LABELS } from "@/lib/stats";
import { PriceHistoryChart } from "../PriceHistoryChart";
import { ProductImg } from "../ProductImg";
import { ZoomModal } from "../ZoomModal";
import { PriceTag } from "./PriceTag";
import { boardLayoutId } from "./RackBoard";

const cleanName = (n: string) => n.replace(/ \(mock\)$/, "");

export interface LiveCheck {
  status: "checking" | "fresh" | "updated" | "failed";
  message: string;
}

/** Label taped next to the board with a doodle arrow pointing at it. */
function Callout({ part, title, children }: { part: string; title: string; children: React.ReactNode }) {
  return (
    <div className="relative flex items-start gap-2">
      <img src={ASSETS.doodleArrow} alt="" className="mt-3 hidden h-6 w-12 shrink-0 -scale-x-100 opacity-90 sm:block md:order-last md:scale-x-100" />
      <div className="min-w-0 flex-1 rounded-xl border-2 border-paper/15 bg-asphalt/80 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-acid">{part}</div>
        <div className="headline text-xl text-paper">{title}</div>
        <div className="mt-1 text-xs leading-snug text-paper/70">{children}</div>
      </div>
    </div>
  );
}

export function BoardDetail({ group, wallId, siblings, rec, budget, held, onToggleHold, onNavigate, onClose, live }: {
  group: BoardGroup;
  wallId: string;
  siblings: BoardGroup[];
  rec: Recommendation | null;
  budget: Budget;
  held: boolean;
  onToggleHold: () => void;
  onNavigate: (groupId: string) => void;
  onClose: () => void;
  live?: LiveCheck | null;
}) {
  const { board, best } = group;
  const [zoom, setZoom] = useState(false);
  const idx = siblings.findIndex((g) => g.id === group.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const stats = boardStats(board);
  const msrp = effectiveMsrp(best.listing, board);
  const pct = Math.round(best.grade.discountPct * 100);
  const sizes = (best.matchingSizes.length ? best.matchingSizes.map((m) => m.size) : best.listing.sizes).toSorted((a, b) => a.lengthCm - b.lengthCm);
  const images = board.images.length ? board.images : [ASSETS.boardPlaceholder];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (zoom) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && prev) onNavigate(prev.id);
      if (e.key === "ArrowRight" && next) onNavigate(next.id);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [zoom, prev, next, onClose, onNavigate]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80 && next) onNavigate(next.id);
    else if (info.offset.x > 80 && prev) onNavigate(prev.id);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-asphalt/85 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${board.brand} ${board.model}`}
    >
      {/* top bar */}
      <div className="app-gutter sticky top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-asphalt via-asphalt/90 to-transparent pb-4 pt-3" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <button type="button" onClick={onClose} className="rounded-full border-2 border-paper/30 bg-asphalt p-2" aria-label="Back to the shop"><X className="h-5 w-5" /></button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onToggleHold} aria-pressed={held}
            className={clsx("flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-semibold", held ? "border-pink bg-pink/20 text-paper" : "border-paper/30")}>
            <img src={ASSETS.icon.watch} alt="" className="h-5 w-5" />{held ? "On hold" : "Hold"}
          </button>
          <button type="button" disabled={!prev} onClick={() => prev && onNavigate(prev.id)} className="rounded-full border-2 border-paper/30 p-2 disabled:opacity-30" aria-label="Previous board"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" disabled={!next} onClick={() => next && onNavigate(next.id)} className="rounded-full border-2 border-paper/30 p-2 disabled:opacity-30" aria-label="Next board"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="app-gutter mx-auto max-w-6xl pb-16">
        <div className="grid grid-cols-[minmax(0,42%)_minmax(0,1fr)] gap-x-4 gap-y-6 [grid-template-areas:'board_callouts''info_info'] md:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)] md:gap-x-8 md:[grid-template-areas:'callouts_board_info']">
          {/* the board */}
          <div className="relative [grid-area:board] md:pt-4">
            <motion.div
              layoutId={boardLayoutId(wallId, group.id)}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.35}
              onDragEnd={onDragEnd}
              transition={{ type: "spring", stiffness: 210, damping: 26 }}
              className="relative mx-auto h-[min(62vh,560px)] w-full max-w-[260px] cursor-grab overflow-hidden rounded-[36px] border-[5px] border-paper bg-paper shadow-[0_14px_0_rgba(0,0,0,0.45)] active:cursor-grabbing"
            >
              <button type="button" onClick={() => setZoom(true)} className="block h-full w-full cursor-zoom-in" aria-label="Zoom photos">
                <ProductImg src={images[0]} alt={`${board.brand} ${board.model}`} className="h-full w-full object-contain p-2" />
              </button>
            </motion.div>
            <div key={group.id} className="spray pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2" style={{ backgroundImage: `url(${ASSETS.snowSpray})` }} aria-hidden />
            <img src={ASSETS.rank[group.tier]} alt="" className="absolute -left-1 top-2 h-14 w-14 -rotate-12 drop-shadow md:top-6" />
            <p className="mt-3 text-center text-[11px] text-paper/50">Swipe for the next board · tap to zoom</p>
          </div>

          {/* callouts around the board */}
          <div className="flex flex-col gap-3 [grid-area:callouts] md:justify-center">
            <Callout part="Nose · shape" title={board.shape ? SHAPE_INFO[board.shape].label : "Shape not listed"}>
              {board.shape ? SHAPE_INFO[board.shape].text : "The shop didn't list the shape."}
            </Callout>
            <Callout part="Base · profile" title={board.profile ? PROFILE_INFO[board.profile].label : "Profile not listed"}>
              {board.profile && (
                <svg viewBox="0 0 120 30" className="mb-1 h-6 w-full max-w-[160px]" aria-hidden>
                  <line x1="0" x2="120" y1="25" y2="25" stroke="rgba(250,250,247,0.25)" strokeDasharray="3 3" />
                  <path d={PROFILE_PATH[board.profile]} fill="none" stroke="#d4ff3a" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              )}
              {board.profile ? PROFILE_INFO[board.profile].text : "The shop didn't list the camber profile."}
            </Callout>
            <Callout part="Waist · your sizes" title={rec ? `${rec.idealLengthCm}${rec.requiresWide ? "W" : ""} cm ideal` : "Sizes"}>
              <span className="flex flex-wrap gap-1">
                {sizes.map((s) => (
                  <span key={s.label} className={clsx("rounded-full border px-2 py-0.5 font-semibold", s.waist === "wide" ? "border-acid text-acid" : "border-paper/30 text-paper", !s.inStock && "line-through opacity-40")}>{s.label}</span>
                ))}
              </span>
            </Callout>
            <Callout part="Tail · flex" title={board.flex !== null ? `${board.flex}/10 · ${flexWord(board.flex)}` : "Flex not listed"}>
              <span className="relative mt-1 block h-2.5 rounded-full bg-paper/15">
                {rec && <span className="absolute inset-y-0 rounded-full bg-acid/30" style={{ left: `${(rec.flexRange[0] - 1) * 11.1}%`, right: `${(10 - rec.flexRange[1]) * 11.1}%` }} />}
                {board.flex !== null && <span className="absolute -top-1 h-4.5 w-4.5 -translate-x-1/2 rounded-full border-[3px] border-paper bg-acid" style={{ left: `${(board.flex - 1) * 11.1}%` }} />}
              </span>
              {rec && <span className="mt-1.5 block">Shaded = good flex for you ({rec.flexRange[0]}–{rec.flexRange[1]}).</span>}
            </Callout>
          </div>

          {/* info panel */}
          <div className="flex min-w-0 flex-col gap-5 [grid-area:info]">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-paper/60">{board.brand} · {board.season}</div>
              <h2 className="headline text-5xl">{board.model}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border-2 border-paper/20 px-2.5 py-0.5 font-semibold">
                  Rank {TIER_RANK[group.tier]} · {isFullPrice(best.grade) ? "Full price" : TIER_LABELS[group.tier]}
                </span>
                <span className="rounded-full bg-acid px-2.5 py-0.5 font-bold text-asphalt">Match {group.value.score}</span>
              </div>
              {group.value.reasons.length > 0 && <p className="mt-2 text-sm text-paper/75">{group.value.reasons.join(" · ")}</p>}
            </div>

            {/* stats */}
            <div className="sticker p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="headline text-2xl">Board stats</h3>
                {stats.estimated && <span className="text-[11px] text-paper/50">estimated: shop listed few specs</span>}
              </div>
              <ul className="flex flex-col gap-2.5">
                {STAT_KEYS.map((k) => (
                  <li key={k} className="grid grid-cols-[24px_92px_1fr_20px] items-center gap-2" title={STAT_LABELS[k].hint}>
                    <img src={ASSETS.stat[k]} alt="" className="h-6 w-6" />
                    <span className="text-sm font-semibold">{STAT_LABELS[k].label}</span>
                    <span className="flex gap-[3px]" aria-label={`${stats[k]} out of 10`}>
                      {Array.from({ length: 10 }, (_, i) => (
                        <span key={i} className={clsx("h-3 flex-1 -skew-x-12 rounded-[2px]", i < stats[k] ? "bg-acid" : "bg-paper/12")} />
                      ))}
                    </span>
                    <span className="text-right text-sm font-bold tabular-nums">{stats[k]}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* price */}
            <div className="flex flex-wrap items-start gap-5">
              <PriceTag group={group} size="lg" className="shrink-0 -rotate-3" />
              <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
                {pct > 0 && (
                  <div>
                    <span className="text-paper/60 line-through">{formatMoney(msrp, best.listing.price.currency)}</span>
                    <span className="ml-2 font-bold text-acid">-{pct}% vs MSRP</span>
                  </div>
                )}
                <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-paper/80">
                  <dt>Board</dt><dd className="text-right tabular-nums">{formatMoney(best.landed.item, best.landed.currency)}</dd>
                  <dt>Shipping</dt><dd className="text-right tabular-nums">{best.landed.shipping ? formatMoney(best.landed.shipping, best.landed.currency) : "Free"}</dd>
                  <dt>VAT {Math.round(best.landed.vatRate * 1000) / 10}%{best.landed.vatIncluded ? " (incl.)" : ""}</dt><dd className="text-right tabular-nums">{formatMoney(best.landed.vat, best.landed.currency)}</dd>
                  {best.landed.duties > 0 && (<><dt>Import duty (est.)</dt><dd className="text-right tabular-nums">{formatMoney(best.landed.duties, best.landed.currency)}</dd></>)}
                </dl>
                {group.budget === "over" && budget.max !== null && (
                  <p className="font-semibold text-orange">{formatMoney(best.landed.total - budget.max, best.landed.currency)} over your budget</p>
                )}
                {live && (
                  <p className={clsx("text-xs", live.status === "updated" ? "font-semibold text-acid" : live.status === "failed" ? "text-orange" : "text-paper/60")}>{live.message}</p>
                )}
                <a href={best.listing.url} target="_blank" rel="noopener noreferrer nofollow" className="btn-acid mt-1 flex items-center justify-center gap-2">
                  Buy at {cleanName(best.retailer.name)}<ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {group.offers.length > 1 && (
              <div className="rounded-xl border-2 border-paper/15 p-3 text-sm">
                <div className="mb-1 font-bold uppercase tracking-wide text-paper/60">Also at</div>
                <ul className="flex flex-col gap-1">
                  {group.offers.slice(1).map((o) => (
                    <li key={o.listing.id} className="flex items-center justify-between gap-2">
                      <a href={o.listing.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-acid hover:underline">{cleanName(o.retailer.name)}</a>
                      <span className="tabular-nums">{formatMoney(o.landed.total, o.landed.currency)} delivered</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* below the fold */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="sticker p-4">
            <h3 className="headline mb-2 text-2xl">Price history</h3>
            {best.listing.history.length > 1 ? (
              <div className="text-paper/70">
                <PriceHistoryChart history={best.listing.history} msrp={msrp} stats={best.stats} currency={best.listing.price.currency} height={200} />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <img src={ASSETS.mascot.thinking} alt="" className="h-20 w-20" />
                <p className="text-sm text-paper/70">We just started tracking this board. The chart fills up as we check prices every day.</p>
              </div>
            )}
          </div>
          <div className="sticker flex flex-col gap-4 p-4">
            <div>
              <h3 className="headline text-2xl">Riders & reviews</h3>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Star className="h-5 w-5 fill-acid text-acid" />
                {board.reviews ? <span><b>{board.reviews.average.toFixed(1)}</b> from {board.reviews.count} review{board.reviews.count === 1 ? "" : "s"}</span> : <span className="text-paper/60">No reviews yet</span>}
              </div>
              <div className="mt-2 flex items-start gap-2 text-sm">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-ice" />
                {board.ambassadors.length ? <span>{board.ambassadors.map((a) => a.name).join(", ")}</span> : <span className="text-paper/60">No pro riders linked yet</span>}
              </div>
            </div>
            {group.lastSeason && (
              <p className="rounded-xl bg-ice/10 p-3 text-sm text-ice">
                Last season&apos;s version ({group.lastSeason.season}) is {Math.round(group.lastSeason.savingPct * 100)}% cheaper: {formatMoney(group.lastSeason.total, group.lastSeason.currency)} at {cleanName(group.lastSeason.retailer)}.
              </p>
            )}
          </div>
        </div>
      </div>

      {zoom && <ZoomModal images={images} alt={`${board.brand} ${board.model}`} startIndex={0} onClose={() => setZoom(false)} />}
    </motion.div>
  );
}
