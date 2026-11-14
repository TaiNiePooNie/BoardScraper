import clsx from "clsx";
import { ASSETS } from "@/lib/assets";
import { isFullPrice } from "@/lib/grading";
import type { BoardGroup } from "@/lib/offers";
import { formatMoney } from "@/lib/pricing/currency";

/**
 * Hanging card-stock tag. The tag art's card body spans ~25–92 % of its height
 * (the top is the string loop), so text is centred in that body. The sale
 * sticker sits on the tag's lower corner so it never covers nearby text.
 */
export function PriceTag({ group, size = "sm", className }: { group: BoardGroup; size?: "sm" | "lg"; className?: string }) {
  const { best } = group;
  const pct = Math.round(best.grade.discountPct * 100);
  const full = isFullPrice(best.grade);
  const lg = size === "lg";
  return (
    <div
      className={clsx("relative shrink-0 select-none bg-contain bg-center bg-no-repeat text-asphalt", lg ? "h-[200px] w-[150px]" : "h-[112px] w-[84px]", className)}
      style={{ backgroundImage: `url(${ASSETS.priceTag})` }}
    >
      <div className="absolute inset-x-[18%] bottom-[12%] top-[30%] flex flex-col items-center justify-center text-center">
        <span className={clsx("marker leading-none tabular-nums", lg ? "text-[1.7rem]" : "text-[0.95rem]")}>{formatMoney(best.landed.total, best.landed.currency)}</span>
        <span className={clsx("font-bold uppercase tracking-wide text-asphalt/55", lg ? "mt-1.5 text-[10px]" : "mt-1 text-[7px]")}>delivered</span>
        {group.offers.length > 1 && (
          <span className={clsx("font-bold text-asphalt/70", lg ? "mt-1 text-[11px]" : "mt-0.5 text-[7px]")}>{group.offers.length} shops</span>
        )}
      </div>
      {pct > 0 && (
        <div
          className={clsx("absolute flex items-center justify-center bg-contain bg-center bg-no-repeat", lg ? "-bottom-2 -right-3 h-[64px] w-[64px]" : "-bottom-2 -right-3 h-[40px] w-[40px]")}
          style={{ backgroundImage: `url(${ASSETS.saleSticker})`, transform: "rotate(-10deg)" }}
        >
          <span className={clsx("headline text-asphalt", lg ? "text-base" : "text-[11px]")}>-{pct}%</span>
        </div>
      )}
      {full && (
        <div
          className={clsx("absolute left-1/2 flex -translate-x-1/2 items-center justify-center bg-contain bg-center bg-no-repeat", lg ? "bottom-1 h-[34px] w-[100px]" : "bottom-0 h-[20px] w-[60px]")}
          style={{ backgroundImage: `url(${ASSETS.stickerFullPrice})`, transform: "rotate(-4deg)" }}
        >
          <span className={clsx("headline text-paper", lg ? "text-xs" : "text-[7px]")}>Full price</span>
        </div>
      )}
    </div>
  );
}
