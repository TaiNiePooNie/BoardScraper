import clsx from "clsx";
import { ASSETS } from "@/lib/assets";
import { isFullPrice } from "@/lib/grading";
import type { BoardGroup } from "@/lib/offers";
import { formatMoney } from "@/lib/pricing/currency";

/** Hanging card-stock tag: delivered price in marker, sale sticker with the drop. */
export function PriceTag({ group, size = "sm", className }: { group: BoardGroup; size?: "sm" | "lg"; className?: string }) {
  const { best } = group;
  const pct = Math.round(best.grade.discountPct * 100);
  const full = isFullPrice(best.grade);
  const lg = size === "lg";
  return (
    <div
      className={clsx("relative select-none bg-contain bg-center bg-no-repeat text-asphalt", lg ? "h-[200px] w-[150px]" : "h-[112px] w-[84px]", className)}
      style={{ backgroundImage: `url(${ASSETS.priceTag})` }}
    >
      <div className={clsx("absolute inset-x-0 flex flex-col items-center text-center", lg ? "top-[46px]" : "top-[30px]")}>
        <span className={clsx("marker leading-none tabular-nums", lg ? "text-3xl" : "text-lg")}>{formatMoney(best.landed.total, best.landed.currency)}</span>
        <span className={clsx("font-semibold uppercase tracking-wide text-asphalt/60", lg ? "mt-1 text-[11px]" : "mt-0.5 text-[8px]")}>delivered</span>
        {group.offers.length > 1 && (
          <span className={clsx("font-bold text-asphalt/70", lg ? "mt-1 text-xs" : "text-[8px]")}>{group.offers.length} shops</span>
        )}
      </div>
      {pct > 0 && (
        <div
          className={clsx("absolute flex items-center justify-center bg-contain bg-center bg-no-repeat", lg ? "-right-8 -top-2 h-[78px] w-[78px]" : "-right-5 -top-1 h-[46px] w-[46px]")}
          style={{ backgroundImage: `url(${ASSETS.saleSticker})`, transform: "rotate(12deg)" }}
        >
          <span className={clsx("headline text-asphalt", lg ? "text-xl" : "text-[13px]")}>-{pct}%</span>
        </div>
      )}
      {full && (
        <div
          className={clsx("absolute left-1/2 flex -translate-x-1/2 items-center justify-center bg-contain bg-center bg-no-repeat", lg ? "bottom-3 h-[38px] w-[110px]" : "bottom-1.5 h-[22px] w-[64px]")}
          style={{ backgroundImage: `url(${ASSETS.stickerFullPrice})`, transform: "rotate(-4deg)" }}
        >
          <span className={clsx("headline text-paper", lg ? "text-sm" : "text-[8px]")}>Full price</span>
        </div>
      )}
    </div>
  );
}
