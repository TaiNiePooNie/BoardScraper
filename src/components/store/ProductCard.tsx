"use client";
import clsx from "clsx";
import { Heart } from "lucide-react";
import { ProductImg } from "@/components/ProductImg";
import { ASSETS } from "@/lib/assets";
import { formatMoney } from "@/lib/pricing/currency";
import type { Badge, Product } from "@/lib/store";
import { boardHue } from "@/lib/look";

const BADGE_STYLE: Record<Badge["kind"], string> = {
  fits: "bg-acid text-ink",
  discount: "bg-sale text-white font-display !font-black",
  lowest: "bg-ink text-white",
  drop: "bg-ink text-white",
  "last-season": "bg-white text-ink ring-1 ring-line",
  stock: "bg-orange text-ink",
};

/** `short`: on phones use the badge's shorter wording, so three badges fit a 138px-wide card. */
export function BadgePill({ badge, short, className }: { badge: Badge; short?: boolean; className?: string }) {
  return (
    <span className={clsx("inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-2xs font-bold", BADGE_STYLE[badge.kind], className)}>
      {short && badge.short ? <><span className="truncate sm:hidden">{badge.short}</span><span className="hidden truncate sm:inline">{badge.label}</span></> : <span className="truncate">{badge.label}</span>}
    </span>
  );
}

export function Price({ p, size = "md" }: { p: Product; size?: "md" | "lg" }) {
  const sale = p.wasTotal !== null;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className={clsx("num", size === "lg" ? "text-3xl" : "text-xl leading-tight")}>{formatMoney(p.total, p.currency)}</span>
      {sale && <s className={clsx("tabular-nums text-muted", size === "lg" ? "text-base" : "text-xs")} title={p.wasSource === "rrp" ? "Recommended retail price" : "Highest price we've seen"}><span className="sr-only">was </span>{formatMoney(p.wasTotal!, p.currency)}</s>}
      {sale && size === "lg" && <span className="text-xs text-muted">{p.wasSource === "rrp" ? "vs. recommended retail price" : "vs. the highest price we've seen"}</span>}
    </span>
  );
}

export function ProductCard({ p, saved, onOpen, onToggleSave, priority }: { p: Product; saved: boolean; onOpen: () => void; onToggleSave: () => void; priority?: boolean }) {
  const shops = new Set(p.offers.map((o) => o.retailer.id)).size;
  const yourSize = p.fitSizes[0]?.size.label;
  const name = `${p.board.brand} ${p.board.model}`;
  return (
    <article className="relative min-w-0">
      <button type="button" onClick={onOpen} className="group block w-full rounded-card text-left">
        {/* Tile tinted with the board's own colour; the cut-out board leans a little. */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-[20px]" style={{ background: `hsl(${boardHue(p.board)} 30% 86%)` }}>
          <ProductImg
            src={p.board.images[0]}
            alt={name}
            loading={priority ? "eager" : "lazy"}
            size={600}
            cut
            placeholder={ASSETS.placeholder[p.board.sport]}
            className="absolute inset-[7%] h-[86%] w-[86%] -rotate-6 object-contain drop-shadow-[0_12px_10px_rgb(0_0_0/0.25)] transition duration-300 group-hover:-rotate-3 group-hover:scale-[1.04]"
          />
          {/* Bottom-left, wrapping: never under the save button, never wider than the card. */}
          {p.badges.length > 0 && (
            <div className="absolute inset-x-2 bottom-2 flex flex-wrap items-end gap-1">
              {p.badges.slice(0, 3).map((b) => <BadgePill key={b.kind} badge={b} short />)}
            </div>
          )}
        </div>
        <div className="mt-2.5 min-w-0 px-0.5">
          <p className="truncate text-2xs font-semibold uppercase tracking-[0.14em] text-muted">{p.board.brand}</p>
          <h3 className="line-clamp-2 break-words text-sm font-bold leading-snug">{p.board.model}</h3>
          <p className="mt-1"><Price p={p} /></p>
          <p className="mt-0.5 flex min-w-0 flex-wrap gap-x-1 text-xs text-muted">
            {yourSize ? <span className="max-w-full truncate font-semibold text-ok">Your size {yourSize}</span> : null}
            <span className="max-w-full truncate">{yourSize ? "· " : ""}{shops > 1 ? `${shops} shops` : p.best.retailer.name}</span>
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onToggleSave}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
        className="absolute right-1.5 top-1.5 grid h-11 w-11 place-items-center rounded-full"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-paper shadow-card transition hover:scale-105">
          <Heart className={clsx("h-[18px] w-[18px]", saved ? "fill-sale text-sale" : "text-ink")} />
        </span>
      </button>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="aspect-[4/5] rounded-[20px] bg-surface" />
      <div className="mt-2.5 h-3 w-1/3 rounded bg-surface" />
      <div className="mt-1.5 h-4 w-4/5 rounded bg-surface" />
      <div className="mt-1.5 h-4 w-1/4 rounded bg-surface" />
    </div>
  );
}
