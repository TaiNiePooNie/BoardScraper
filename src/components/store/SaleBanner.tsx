"use client";
import clsx from "clsx";
import { CalendarClock, Heart, Sparkles, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import { buyOrWait, salesFor } from "@/lib/sales";
import type { Product } from "@/lib/store";
import type { Sport } from "@/lib/types";

const fmtDate = (x: Date) => x.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

/** Shop banner: a sale running now, or the next one within ~6 weeks. */
export function SaleBanner({ sport, country, onShowSale, onAlerts }: { sport: Sport; country: string; onShowSale: () => void; onAlerts: () => void }) {
  const { active, upcoming } = useMemo(() => salesFor(new Date(), country, sport, 45), [country, sport]);
  const now = active[0];
  const next = upcoming[0];
  if (!now && !next) return null;
  const e = now ?? next!;
  const range = `${Math.round(e.typical[0] * 100)}–${Math.round(e.typical[1] * 100)}%`;
  return (
    <section aria-label="Sale calendar" className={clsx("mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3", now ? "border-sale/30 bg-sale/5" : "border-line bg-surface")}>
      {now ? <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sale" /> : <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="min-w-0 flex-1 text-sm">
        {now ? (
          <p><b>{now.name} is on</b> until {fmtDate(now.end)}. Boards are usually {range} off.</p>
        ) : (
          <p><b>{next!.name} {next!.inDays === 1 ? "starts tomorrow" : `in ${next!.inDays} days`}</b> ({fmtDate(next!.start)}). Prices usually drop {range}. Save boards with ♥ and turn on price-drop emails to hear when they get cheaper.</p>
        )}
        {upcoming.length > (now ? 0 : 1) && (
          <p className="mt-0.5 text-xs text-muted">Also coming up: {upcoming.slice(now ? 0 : 1, now ? 2 : 3).map((u) => `${u.name} (${fmtDate(u.start)})`).join(", ")}</p>
        )}
      </div>
      <button type="button" onClick={now ? onShowSale : onAlerts} className="chip shrink-0 !text-xs">{now ? "Show sale boards" : "Price alerts"}</button>
    </section>
  );
}

/** Board page: buy now or wait for the next sale? */
export function BuyOrWait({ p, country, saved, onSave }: { p: Product; country: string; saved: boolean; onSave: () => void }) {
  const v = useMemo(() => buyOrWait({ now: new Date(), country, sport: p.board.sport, discountPct: p.discountPct, lowestIn90: p.badges.some((b) => b.kind === "lowest") }), [country, p]);
  if (!v) return null;
  const Icon = v.kind === "wait" ? CalendarClock : TrendingDown;
  return (
    <section aria-label="Buy now or wait" className={clsx("rounded-2xl border px-4 py-3 text-sm", v.kind === "wait" ? "border-line bg-surface" : "border-ok/30 bg-ok/5")}>
      <p className={clsx("flex items-center gap-2 font-bold", v.kind !== "wait" && "text-ok")}><Icon className="h-4 w-4 shrink-0" />{v.title}</p>
      <p className="mt-1 text-muted">{v.text}</p>
      {v.kind !== "buy" && !saved && (
        <button type="button" onClick={onSave} className="btn-ghost mt-2 !py-1.5 !text-xs"><Heart className="h-3.5 w-3.5" />Save and watch the price</button>
      )}
    </section>
  );
}
