"use client";
import clsx from "clsx";
import { ArrowLeft, Check, ExternalLink, Heart, Info, Share2, Star, TriangleAlert } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ProductImg } from "@/components/ProductImg";
import { ASSETS } from "@/lib/assets";
import { formatMoney } from "@/lib/pricing/currency";
import type { SportFit } from "@/lib/sizing";
import { boardStats, STAT_KEYS, STAT_LABELS } from "@/lib/stats";
import { CATEGORY_LABEL, type Product } from "@/lib/store";
import { effectiveMsrp } from "@/lib/deals";
import type { Deal } from "@/lib/types";
import { BadgePill } from "./ProductCard";
import { FitWord, SidewaysBoard, useIsWide } from "./look";
import { boardHue, heroWord, hueStyle } from "@/lib/look";
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
const SPORT_KIND: Record<string, string> = { snow: "Snowboard", skate: "Skateboard", surf: "Surfboard" };
const STYLE_LABEL: Record<string, string> = { park: "Park", freeride: "Freeride", "all-mountain": "All-mountain", powder: "Powder" };
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

  const b = p.board;
  const shops = new Set(p.offers.map((o) => o.retailer.id)).size;
  const heroHeight = useIsWide() ? 260 : 190;
  const fittingLabels = new Set(p.fitSizes.map((m) => m.size.label));
  const offerFits = fit ? new Set(offer.listing.sizes.filter((s) => fittingLabels.has(s.label)).map((s) => s.label)) : new Set<string>();
  const images = p.board.images.length ? p.board.images : [""];
  // Shops with one page per size: buy from the page of your size.
  const buyUrl = offer.listing.sizes.find((z) => z.inStock && offerFits.has(z.label) && z.url)?.url ?? offer.listing.url;
  const share = async () => {
    // The live site shares /board/<id> (title, price and photo in link previews); the static test page keeps its own URL.
    const url = "__BB_ASSETS" in globalThis ? `${location.origin}${location.pathname}?board=${p.id}` : `${location.origin}/board/${p.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${p.board.brand} ${p.board.model}`, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch { /* cancelled */ }
  };

  const word = heroWord(b.model);
  // Category names are plural ("Longboards"): one board here.
  const cat = b.category ? CATEGORY_LABEL[b.category].replace(/^(\w+)s$/, "$1") : SPORT_KIND[b.sport];
  const left = [cat, ...(b.sport === "snow" ? b.styles.slice(0, 2).map((s) => STYLE_LABEL[s] ?? s) : []), b.season].filter(Boolean).join(" · ");
  const right = [b.flex ? `Flex ${b.flex}` : null, b.profile ? PROFILE_LABEL[b.profile] : null, b.shape ? SHAPE_LABEL[b.shape] : null].filter(Boolean).join(" · ")
    || `${shops} shop${shops === 1 ? "" : "s"}`;
  const isBest = offer === p.best;
  const total = offer.landed.total;
  const was = isBest ? p.wasTotal : null;
  const off = was ? Math.round((1 - total / was) * 100) : 0;
  const { shipping } = costParts(offer);

  return (
    <div ref={top} tabIndex={-1} className="hue fixed inset-0 z-50 overflow-y-auto bg-cream text-ink animate-[page-in_.25s_ease-out]" style={hueStyle(boardHue(b))} role="dialog" aria-modal="true" aria-label={`${b.brand} ${b.model}`}>
      {/* top bar: part of the band, stays put while scrolling */}
      <div className="sticky top-0 z-10 bg-deep text-word" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="app-gutter mx-auto flex h-14 max-w-6xl items-center gap-1">
          <button type="button" onClick={onClose} className="icon-btn -ml-3 text-word hover:bg-white/10" aria-label="Back to the shop"><ArrowLeft className="h-5 w-5" /></button>
          <span className="flex-1" />
          <button type="button" onClick={share} className="icon-btn text-word hover:bg-white/10" aria-label={shared ? "Link copied" : "Share this board"}>{shared ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}</button>
          <button type="button" onClick={onToggleSave} aria-pressed={saved} className="icon-btn -mr-2 text-word hover:bg-white/10" aria-label={saved ? "Remove from saved" : "Save this board"}>
            <Heart className={clsx("h-5 w-5", saved && "fill-current")} />
          </button>
        </div>
      </div>

      {/* hero: giant model word with the board lying across it */}
      <header className="bg-deep text-word">
        <div className="app-gutter mx-auto max-w-6xl pb-1 pt-1">
          <div className="eyebrow flex justify-between gap-4"><span>{left}</span><span className="text-right">{right}</span></div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] opacity-80">{b.brand}</p>
          <FitWord as="h2" max={280}>{word}</FitWord>
        </div>
      </header>
      <div className="relative" style={{ background: "linear-gradient(var(--color-deep) 0 62%, var(--color-cream) 62%)" }}>
        <div className="app-gutter mx-auto max-w-6xl pb-3">
          <SidewaysBoard src={images[0]} cutout={b.cutout} alt={`${b.brand} ${b.model}`} placeholder={ASSETS.placeholder[b.sport]} maxHeight={heroHeight} className="-mt-[0.4rem] md:-mt-4" eager />
        </div>
      </div>

      <div className="app-gutter mx-auto grid max-w-6xl gap-7 pb-36 pt-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12 md:pb-16">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label="Price">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="label">{isBest ? `Best price${shops > 1 ? ` · ${shops} shops` : ""}` : `At ${offer.retailer.name}`}</p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                  <span className="num text-[2.75rem] leading-none">{formatMoney(total, offer.landed.currency)}</span>
                  {was && <s className="text-base text-muted tabular-nums" title={p.wasSource === "rrp" ? "Recommended retail price" : "Highest price we've seen"}><span className="sr-only">was </span>{formatMoney(was, offer.landed.currency)}</s>}
                </p>
              </div>
              {off > 0 ? (
                <p className="shrink-0 text-right font-display text-3xl font-black leading-none tracking-tight text-sale">−{off}%<span className="label mt-1 block">{p.wasSource === "rrp" ? "under RRP" : "under its high"}</span></p>
              ) : (
                <p className="shrink-0 text-right font-display text-lg font-black leading-none">Full price<span className="label mt-1 block">{isBest ? "wait for a sale?" : `${shipping > 0 ? "plus shipping" : "free shipping"}`}</span></p>
              )}
            </div>
            <CostBreakdown d={offer} shipTo={shipTo} />
            {live && isBest && <LiveLine live={live} d={offer} />}
          </section>

          <section aria-label="Sizes">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="label min-w-0 truncate">Sizes at {offer.retailer.name}</h3>
              <button type="button" onClick={onEditSize} className="link shrink-0 py-1.5 text-sm">{fit ? `Your size: ${fit.rangeLabel}` : "Find my size"}</button>
            </div>
            <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
              {offer.listing.sizes.map((s) => {
                const yours = offerFits.has(s.label);
                return (
                  <span key={s.label} className={clsx(
                    "relative shrink-0 min-w-[3.5rem] rounded-full border-[1.5px] px-3.5 py-2.5 text-center text-sm font-bold tabular-nums",
                    !s.inStock ? "border-line text-muted line-through opacity-60" : yours ? "border-ink bg-ink text-white" : "border-line",
                  )}>
                    {!s.inStock && <span className="sr-only">Sold out: </span>}{yours && <span className="sr-only">Your size: </span>}{s.label}{s.volumeL ? <span className="block text-2xs font-medium opacity-70">{s.volumeL} L</span> : null}
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
            {fit && p.fits === false && <p className="mt-2 text-sm text-muted">No size here is in your {fit.rangeLabel} range{b.sport === "snow" && fit.snow?.requiresWide ? " (you need a wide board)" : ""}.</p>}
          </section>

          <div>
            <p className="text-sm text-muted">{b.brand} {b.model}{b.reviews && b.reviews.count > 0 && (
              <span className="ml-2 inline-flex items-center gap-0.5 font-semibold text-ink"><Star className="h-3.5 w-3.5 fill-ink" />{b.reviews.average.toFixed(1)} <span className="font-normal text-muted">({b.reviews.count})</span></span>
            )}</p>
            {p.badges.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{p.badges.map((x) => <BadgePill key={x.kind} badge={x} className="!px-2.5 !py-1 !text-xs" />)}</div>}
          </div>

          <BuyOrWait p={p} country={country} saved={saved} onSave={onToggleSave} />

          {/* desktop CTA (phones: the bar at the bottom) */}
          <BuyBar href={buyUrl} shop={offer.retailer.name} shipping={shipping} currency={offer.landed.currency} className="hidden md:flex" />
        </div>

        <div className="flex min-w-0 flex-col gap-7">
          {p.offers.length > 1 && (
            <section aria-label="Compare shops" className="border-t border-line pt-5 md:border-0 md:pt-0">
              <h3 className="font-display text-base font-black uppercase tracking-wide">Compare {p.offers.length} offers</h3>
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-card border-[1.5px] border-line bg-paper">
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
                        <span className="num text-right text-lg">{formatMoney(o.landed.total, o.landed.currency)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {offer.listing.history.length > 1 && (
            <section aria-label="Price history" className="border-t border-line pt-5">
              <h3 className="font-display text-base font-black uppercase tracking-wide">Price history at {offer.retailer.name}</h3>
              <p className="text-xs text-muted">In {offer.listing.price.currency}, before delivery{offer.stats ? ` · lowest ever ${formatMoney(offer.stats.allTimeLow, offer.listing.price.currency)}` : ""}</p>
              <div className="mt-2 h-[170px] text-muted">
                <Suspense fallback={<div className="h-full animate-pulse rounded-card bg-surface" aria-hidden />}>
                  <PriceHistoryChart history={offer.listing.history} msrp={effectiveMsrp(offer.listing, offer.board)} stats={offer.stats} currency={offer.listing.price.currency} height={170} />
                </Suspense>
              </div>
            </section>
          )}

          {images.length > 1 && <Photos images={images} alt={`${b.brand} ${b.model}`} placeholder={ASSETS.placeholder[b.sport]} />}

          <Details p={p} fit={fit} />
        </div>
      </div>

      {/* phones: dark buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-cream from-60% to-transparent pt-6 md:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}>
        <div className="app-gutter"><BuyBar href={buyUrl} shop={offer.retailer.name} shipping={shipping} currency={offer.landed.currency} /></div>
      </div>
    </div>
  );
}

/** The dark "Buy at shop · delivery" bar. */
function BuyBar({ href, shop, shipping, currency, className }: { href: string; shop: string; shipping: number; currency: Deal["landed"]["currency"]; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Buy at ${shop} (opens the shop)`}
      className={clsx("flex min-h-14 items-center justify-between gap-3 rounded-[18px] bg-deeper px-5 py-3.5 text-white shadow-float transition active:scale-[0.99]", className ?? "flex")}>
      <span className="flex min-w-0 items-center gap-2 truncate text-md font-bold">Buy at {shop}<ExternalLink className="h-4 w-4 shrink-0 opacity-70" /></span>
      <span className="shrink-0 text-sm text-on-deep">{shipping > 0 ? `+ ${formatMoney(shipping, currency)} delivery` : "Free delivery"}</span>
    </a>
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

/** Every shop photo, upright, in a sideways-scrolling strip. */
function Photos({ images, alt, placeholder }: { images: string[]; alt: string; placeholder: string }) {
  return (
    <section aria-label="Photos" className="border-t border-line pt-5">
      <h3 className="font-display text-base font-black uppercase tracking-wide">Photos</h3>
      <div className="no-scrollbar -mx-4 mt-2 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:px-0">
        {images.map((src, k) => (
          <div key={k} className="grid h-56 w-40 shrink-0 snap-start place-items-center rounded-card bg-paper p-3">
            <ProductImg src={src} alt={k === 0 ? alt : ""} size={440} loading="lazy" placeholder={placeholder} className="h-full w-full object-contain mix-blend-multiply" />
          </div>
        ))}
      </div>
    </section>
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
        <section aria-label="Details" className="border-t border-line pt-5">
          <h3 className="font-display text-base font-black uppercase tracking-wide">Details</h3>
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
