"use client";
import clsx from "clsx";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, Heart, Info, Share2, Star, TriangleAlert } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ProductImg } from "@/components/ProductImg";
import { ASSETS } from "@/lib/assets";
import { formatMoney } from "@/lib/pricing/currency";
import type { SportFit } from "@/lib/sizing";
import { boardStats, STAT_KEYS, STAT_LABELS } from "@/lib/stats";
import { CATEGORY_LABEL, type Product } from "@/lib/store";
import { effectiveMsrp } from "@/lib/deals";
import type { Deal } from "@/lib/types";
import { BadgePill, Price } from "./ProductCard";
import { BuyOrWait } from "./SaleBanner";
import { useDialog } from "./useDialog";

// recharts is ~100 kB: only fetched when a product with price history is opened.
// (React.lazy rather than next/dynamic, so the single-file static build keeps working.)
const PriceHistoryChart = lazy(() => import("./PriceHistoryChart"));

export interface LiveCheck {
  status: "checking" | "fresh" | "updated" | "failed";
  message: string;
  checkedAgo?: string;
  soldOut?: boolean;
}

const PROFILE_LABEL: Record<string, string> = {
  camber: "Camber", rocker: "Rocker", flat: "Flat", "hybrid-camber": "Hybrid camber", "hybrid-rocker": "Hybrid rocker", "directional-camber": "Directional camber",
};
const SHAPE_LABEL: Record<string, string> = { "true-twin": "True twin", "directional-twin": "Directional twin", directional: "Directional", tapered: "Tapered" };

export function ProductPage({ p, fit, saved, onToggleSave, onClose, onEditSize, live, shipTo, country }: {
  p: Product;
  fit: SportFit | null;
  saved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  onEditSize: () => void;
  live?: LiveCheck;
  shipTo: string;
  /** Buyer country, for the sale calendar. */
  country: string;
}) {
  const [offerId, setOfferId] = useState(p.best.listing.id);
  const [shared, setShared] = useState(false);
  const offer = p.offers.find((o) => o.listing.id === offerId) ?? p.best;
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { setOfferId(p.best.listing.id); top.current?.scrollTo({ top: 0 }); }, [p.id, p.best.listing.id]);
  useDialog(top, onClose);

  const fittingLabels = new Set(p.fitSizes.map((m) => m.size.label));
  const offerFits = fit ? new Set(offer.listing.sizes.filter((s) => fittingLabels.has(s.label)).map((s) => s.label)) : new Set<string>();
  const images = p.board.images.length ? p.board.images : [""];
  // Shops with one page per size: buy from the page of your size.
  const buyUrl = offer.listing.sizes.find((z) => z.inStock && offerFits.has(z.label) && z.url)?.url ?? offer.listing.url;
  const share = async () => {
    const url = `${location.origin}${location.pathname}?board=${p.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${p.board.brand} ${p.board.model}`, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch { /* cancelled */ }
  };

  return (
    <div ref={top} tabIndex={-1} className="fixed inset-0 z-50 overflow-y-auto bg-white animate-[page-in_.25s_ease-out]" role="dialog" aria-modal="true" aria-label={`${p.board.brand} ${p.board.model}`}>
      {/* top bar */}
      <div className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="app-gutter mx-auto flex h-14 max-w-6xl items-center gap-2">
          <button type="button" onClick={onClose} className="-ml-3 flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full px-3 text-sm font-semibold transition hover:bg-surface" aria-label="Back to the shop">
            <ArrowLeft className="h-5 w-5" /><span className="hidden sm:inline">Back</span>
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold sm:hidden">{p.board.brand}</p>
          <button type="button" onClick={share} className="icon-btn" aria-label={shared ? "Link copied" : "Share this board"}>{shared ? <Check className="h-5 w-5 text-ok" /> : <Share2 className="h-5 w-5" />}</button>
          <button type="button" onClick={onToggleSave} aria-pressed={saved} className="icon-btn -mr-2" aria-label={saved ? "Remove from saved" : "Save this board"}>
            <Heart className={clsx("h-5 w-5", saved && "fill-sale text-sale")} />
          </button>
        </div>
      </div>

      <div className="app-gutter mx-auto grid max-w-6xl gap-6 pb-32 pt-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-10 md:pb-16 md:pt-8">
        <Gallery images={images} alt={`${p.board.brand} ${p.board.model}`} placeholder={ASSETS.placeholder[p.board.sport]} />

        <div className="flex min-w-0 flex-col gap-6">
          <header>
            <p className="text-sm font-semibold text-muted">{p.board.brand}</p>
            <h2 className="mt-0.5 break-words text-2xl font-bold leading-tight sm:text-3xl">{p.board.model}</h2>
            <p className="mt-1 text-sm text-muted">
              {[p.board.category ? CATEGORY_LABEL[p.board.category] : null, p.board.season].filter(Boolean).join(" · ")}
              {p.board.reviews && p.board.reviews.count > 0 && (
                <span className="ml-2 inline-flex items-center gap-0.5 font-semibold text-ink"><Star className="h-3.5 w-3.5 fill-ink" />{p.board.reviews.average.toFixed(1)} <span className="font-normal text-muted">({p.board.reviews.count})</span></span>
              )}
            </p>
            {p.badges.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{p.badges.map((b) => <BadgePill key={b.kind} badge={b} className="!px-2.5 !py-1 !text-xs" />)}</div>}
          </header>

          <section aria-label="Price">
            <OfferPrice d={offer} p={p} isBest={offer === p.best} />
            <CostBreakdown d={offer} shipTo={shipTo} />
            {live && offer === p.best && <LiveLine live={live} d={offer} />}
          </section>

          <BuyOrWait p={p} country={country} saved={saved} onSave={onToggleSave} />

          <section aria-label="Sizes">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="min-w-0 truncate text-sm font-bold">Sizes at {offer.retailer.name}</h3>
              <button type="button" onClick={onEditSize} className="link shrink-0 py-1.5 text-sm">{fit ? `Your size: ${fit.rangeLabel}` : "Find my size"}</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {offer.listing.sizes.map((s) => {
                const yours = offerFits.has(s.label);
                return (
                  <span key={s.label} className={clsx(
                    "relative min-w-[3.25rem] rounded-control border px-3 py-2 text-center text-sm font-semibold tabular-nums",
                    !s.inStock ? "border-line text-muted line-through" : yours ? "border-ink bg-acid" : "border-line",
                  )}>
                    {!s.inStock && <span className="sr-only">Sold out: </span>}{yours && <span className="sr-only">Your size: </span>}{s.label}{s.volumeL ? <span className="block text-2xs font-medium text-muted">{s.volumeL} L</span> : null}
                    {yours && <span aria-hidden className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-ink text-white"><Check className="h-3 w-3" /></span>}
                  </span>
                );
              })}
            </div>
            {p.stock.note && (
              <p className={clsx("mt-2", p.stock.level === "last" ? "note-alert" : "note-warn")} role="status">
                <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />{p.stock.note}
              </p>
            )}
            {p.stock.level === "ok" && p.stock.sizesTotal > 1 && <p className="mt-2 text-xs text-muted">{p.stock.sizesLeft} of {p.stock.sizesTotal} sizes in stock across {p.stock.shops} shop{p.stock.shops === 1 ? "" : "s"}{p.stock.shopsWithYourSize ? ` · your size at ${p.stock.shopsWithYourSize}` : ""}.</p>}
            {fit && p.fits === false && <p className="mt-2 text-sm text-muted">No size here is in your {fit.rangeLabel} range{p.board.sport === "snow" && fit.snow?.requiresWide ? " (you need a wide board)" : ""}.</p>}
          </section>

          {/* desktop CTA (mobile: sticky bar) */}
          <a href={buyUrl} target="_blank" rel="noopener noreferrer" className="btn-primary hidden min-h-12 md:flex">
            Buy at {offer.retailer.name}<ExternalLink className="h-4 w-4" />
          </a>

          {p.offers.length > 1 && (
            <section aria-label="Compare shops">
              <h3 className="text-sm font-bold">Compare {p.offers.length} offers</h3>
              <ul className="card mt-2 divide-y divide-line overflow-hidden">
                {p.offers.map((o) => {
                  const sel = o === offer;
                  const n = fit ? o.listing.sizes.filter((s) => s.inStock && fittingLabels.has(s.label)).length : null;
                  return (
                    <li key={o.listing.id}>
                      <button type="button" onClick={() => setOfferId(o.listing.id)} aria-pressed={sel} className={clsx("flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface focus-visible:outline-offset-[-2px]", sel && "bg-surface")}>
                        <span className={clsx("grid h-4 w-4 shrink-0 place-items-center rounded-full border-2", sel ? "border-ink bg-ink" : "border-line")}>{sel && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{o.retailer.name}</span>
                          <span className="block truncate text-xs text-muted">{o.board.season}{n !== null ? ` · ${n ? `${n} size${n > 1 ? "s" : ""} fit you` : "no size fits you"}` : ""}</span>
                        </span>
                        <span className="text-right text-sm font-bold tabular-nums">{formatMoney(o.landed.total, o.landed.currency)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {offer.listing.history.length > 1 && (
            <section aria-label="Price history">
              <h3 className="text-sm font-bold">Price history at {offer.retailer.name}</h3>
              <p className="text-xs text-muted">In {offer.listing.price.currency}, before delivery{offer.stats ? ` · lowest ever ${formatMoney(offer.stats.allTimeLow, offer.listing.price.currency)}` : ""}</p>
              <div className="mt-2 h-[170px] text-muted">
                <Suspense fallback={<div className="h-full animate-pulse rounded-card bg-surface" aria-hidden />}>
                  <PriceHistoryChart history={offer.listing.history} msrp={effectiveMsrp(offer.listing, offer.board)} stats={offer.stats} currency={offer.listing.price.currency} height={170} />
                </Suspense>
              </div>
            </section>
          )}

          <Details p={p} fit={fit} />
        </div>
      </div>

      {/* mobile sticky buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="app-gutter flex items-center gap-3 py-3">
          <div className="min-w-0">
            <p className="text-lg font-bold tabular-nums leading-tight">{formatMoney(offer.landed.total, offer.landed.currency)}</p>
            <p className="truncate text-xs text-muted">delivered · {offer.retailer.name}</p>
          </div>
          <a href={buyUrl} target="_blank" rel="noopener noreferrer" className="btn-primary ml-auto shrink-0" aria-label={`Buy at ${offer.retailer.name} (opens the shop)`}>
            Buy at shop<ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

const fmt = (d: Deal, n: number) => formatMoney(n, d.landed.currency);

/** "€85 board + €8 shipping (+ €4 import VAT & duties)", from the same numbers as the delivered total. */
function costParts(d: Deal): { board: number; shipping: number; extra: number } {
  const l = d.landed;
  const board = l.item;
  const shipping = l.shipping;
  const extra = Math.max(0, Math.round((l.total - board - shipping) * 100) / 100);
  return { board, shipping, extra };
}

function CostBreakdown({ d, shipTo }: { d: Deal; shipTo: string }) {
  const { board, shipping, extra } = costParts(d);
  return (
    <p className="mt-1 text-sm text-muted">
      {fmt(d, board)} board {shipping > 0 ? <>+ {fmt(d, shipping)} shipping</> : <>+ <b className="font-semibold text-ok">free shipping</b></>}
      {extra >= 0.5 && <> + {fmt(d, extra)} {d.landed.duties > 0 ? "import VAT & duties" : d.landed.vatIncluded ? "VAT" : "tax"}</>}
      {" "}to {shipTo}, from <b className="font-semibold text-ink">{d.retailer.name}</b>.
      {d.landed.notes.filter((n) => n !== "Free shipping").map((n) => <span key={n} className="block text-xs">{n}</span>)}
    </p>
  );
}

function LiveLine({ live, d }: { live: LiveCheck; d: Deal }) {
  if (live.status === "checking") {
    return <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted"><span className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-transparent" />Checking the shop&apos;s price right now…</p>;
  }
  if (live.status === "failed") return <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted"><Info className="h-3.5 w-3.5" />{live.message}</p>;
  const { shipping } = costParts(d);
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-ok">
      <Check className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>
        {live.status === "updated" ? "Price just changed at the shop. " : `Price checked ${live.checkedAgo ?? "just now"}: `}
        {fmt(d, d.landed.total)} delivered ({shipping > 0 ? `incl. ${fmt(d, shipping)} shipping` : "free shipping"}){live.soldOut ? ", but sold out in every size" : ""}.
      </span>
    </p>
  );
}

function OfferPrice({ d, p, isBest }: { d: Deal; p: Product; isBest: boolean }) {
  if (isBest) return <Price p={p} size="lg" />;
  return <span className="text-3xl font-bold tabular-nums">{formatMoney(d.landed.total, d.landed.currency)}</span>;
}

function Gallery({ images, alt, placeholder }: { images: string[]; alt: string; placeholder: string }) {
  const [i, setI] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const go = (n: number) => {
    const k = (n + images.length) % images.length;
    setI(k);
    strip.current?.scrollTo({ left: k * strip.current.clientWidth, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <div className="md:sticky md:top-20 md:self-start">
      <div className="relative overflow-hidden rounded-sheet bg-surface">
        <div ref={strip} className="no-scrollbar flex aspect-[4/5] max-h-[62dvh] w-full snap-x snap-mandatory overflow-x-auto md:max-h-none"
          onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {images.map((src, k) => (
            <div key={k} className="h-full w-full shrink-0 snap-center">
              <ProductImg src={src} alt={k === 0 ? alt : ""} size={1200} loading={k === 0 ? "eager" : "lazy"} placeholder={placeholder} fillAspect={4 / 5} className="h-full w-full object-contain p-[6%] mix-blend-multiply" coverClassName="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(i - 1)} className="icon-btn absolute left-3 top-1/2 !hidden -translate-y-1/2 bg-white shadow-card md:!grid" aria-label="Previous photo"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => go(i + 1)} className="icon-btn absolute right-3 top-1/2 !hidden -translate-y-1/2 bg-white shadow-card md:!grid" aria-label="Next photo"><ChevronRight className="h-5 w-5" /></button>
            {/* phones swipe the photos; the dots are only buttons where there's a pointer or keyboard */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center md:pointer-events-auto">
              {images.map((_, k) => (
                <button key={k} type="button" onClick={() => go(k)} aria-label={`Photo ${k + 1} of ${images.length}`} aria-current={k === i} className="grid h-8 place-items-center px-1">
                  <span className={clsx("h-1.5 rounded-full transition-all", k === i ? "w-5 bg-ink" : "w-1.5 bg-ink/30")} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Details({ p, fit }: { p: Product; fit: SportFit | null }) {
  const b = p.board;
  const rows: [string, string][] = [];
  if (b.profile) rows.push(["Profile", PROFILE_LABEL[b.profile] ?? b.profile]);
  if (b.shape) rows.push(["Shape", SHAPE_LABEL[b.shape] ?? b.shape]);
  if (b.flex) rows.push(["Flex", `${b.flex}/10 (${b.flex <= 3 ? "soft" : b.flex <= 6 ? "medium" : "stiff"})`]);
  if (b.sport === "snow" && b.styles.length) rows.push(["Made for", b.styles.map((s) => (s === "park" ? "Park" : s === "freeride" ? "Freeride" : "All-mountain")).join(", ")]);
  const stats = b.sport === "snow" ? boardStats(b) : null;
  return (
    <>
      {(rows.length > 0 || stats) && (
        <section aria-label="Details">
          <h3 className="text-sm font-bold">Details</h3>
          {rows.length > 0 && (
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {rows.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}
            </dl>
          )}
          {stats && (
            <ul className="mt-4 flex flex-col gap-2">
              {STAT_KEYS.map((k) => (
                <li key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)_1.5rem] items-center gap-3 text-sm" title={STAT_LABELS[k].hint}>
                  <span className="text-muted">{STAT_LABELS[k].label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface"><span className="block h-full rounded-full bg-ink" style={{ width: `${stats[k] * 10}%` }} /></span>
                  <span className="text-right font-semibold tabular-nums">{stats[k]}</span>
                </li>
              ))}
              {stats.estimated && <li className="flex items-center gap-1 text-xs text-muted"><Info className="h-3.5 w-3.5" />Estimated: the shop doesn&apos;t list every spec.</li>}
            </ul>
          )}
        </section>
      )}
      {fit && (
        <details className="card px-4 text-sm">
          <summary className="cursor-pointer rounded-control py-3 font-bold">How we picked your size ({fit.label})</summary>
          <ul className="mb-3 list-disc pl-5 text-muted">{fit.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </details>
      )}
    </>
  );
}
