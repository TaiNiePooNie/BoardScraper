"use client";
import clsx from "clsx";
import { Heart } from "lucide-react";
import { ProductImg } from "@/components/ProductImg";
import { ASSETS } from "@/lib/assets";
import { formatMoney } from "@/lib/pricing/currency";
import type { Badge, Product } from "@/lib/store";

const BADGE_STYLE: Record<Badge["kind"], string> = {
  fits: "bg-acid text-ink",
  discount: "bg-sale text-white",
  lowest: "bg-ink text-white",
  drop: "bg-ink text-white",
  "last-season": "bg-white text-ink ring-1 ring-line",
};

export function BadgePill({ badge, className }: { badge: Badge; className?: string }) {
  return <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-4", BADGE_STYLE[badge.kind], className)}>{badge.label}</span>;
}

export function Price({ p, size = "md" }: { p: Product; size?: "md" | "lg" }) {
  const sale = p.wasTotal !== null;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className={clsx("font-bold tabular-nums", sale && "text-sale", size === "lg" ? "text-3xl" : "text-[15px]")}>{formatMoney(p.total, p.currency)}</span>
      {sale && <s className={clsx("tabular-nums text-muted", size === "lg" ? "text-base" : "text-xs")}>{formatMoney(p.wasTotal!, p.currency)}</s>}
    </span>
  );
}

export function ProductCard({ p, saved, onOpen, onToggleSave, priority }: { p: Product; saved: boolean; onOpen: () => void; onToggleSave: () => void; priority?: boolean }) {
  const shops = new Set(p.offers.map((o) => o.retailer.id)).size;
  const yourSize = p.fitSizes[0]?.size.label;
  return (
    <article className="relative">
      <button type="button" onClick={onOpen} className="group block w-full text-left">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
          <ProductImg
            src={p.board.images[0]}
            alt={`${p.board.brand} ${p.board.model}`}
            loading={priority ? "eager" : "lazy"}
            size={600}
            placeholder={ASSETS.placeholder[p.board.sport]}
            fillAspect={3 / 4}
            className="absolute inset-0 h-full w-full object-contain p-[8%] mix-blend-multiply transition duration-300 group-hover:scale-[1.04]"
            coverClassName="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
          {p.badges.length > 0 && (
            <div className="absolute left-2 top-2 flex max-w-[75%] flex-col items-start gap-1">
              {p.badges.slice(0, 3).map((b) => <BadgePill key={b.kind} badge={b} />)}
            </div>
          )}
        </div>
        <div className="mt-2.5 px-0.5">
          <p className="truncate text-xs font-medium text-muted">{p.board.brand}</p>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{p.board.model}</h3>
          <p className="mt-1"><Price p={p} /></p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {yourSize ? <><span className="font-semibold text-ok">Your size {yourSize}</span> · </> : null}
            {shops > 1 ? `${shops} shops` : p.best.retailer.name}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onToggleSave}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved" : "Save"}
        className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105"
      >
        <Heart className={clsx("h-[18px] w-[18px]", saved ? "fill-sale text-sale" : "text-ink")} />
      </button>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] rounded-2xl bg-surface" />
      <div className="mt-2.5 h-3 w-1/3 rounded bg-surface" />
      <div className="mt-1.5 h-4 w-4/5 rounded bg-surface" />
      <div className="mt-1.5 h-4 w-1/4 rounded bg-surface" />
    </div>
  );
}
