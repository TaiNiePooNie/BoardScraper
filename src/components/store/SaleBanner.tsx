"use client";
import clsx from "clsx";
import { Bell, CalendarClock, Heart, Sparkles, TrendingDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buyOrWait, salesFor } from "@/lib/sales";
import type { Product } from "@/lib/store";
import type { Sport } from "@/lib/types";

const fmtDate = (x: Date) => x.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

const DISMISSED = "boardbuddy.sales-dismissed";
const readDismissed = (): string[] => { try { return JSON.parse(localStorage.getItem(DISMISSED) ?? "[]"); } catch { return []; } };

/** One-line sale notice (running now, or the next within ~6 weeks). Closable per sale. */
export function SaleBanner({ sport, country, onShowSale, onAlerts }: { sport: Sport; country: string; onShowSale: () => void; onAlerts: () => void }) {
  const { active, upcoming } = useMemo(() => salesFor(new Date(), country, sport, 45), [country, sport]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => setDismissed(readDismissed()), []);
  const now = active[0];
  const next = upcoming[0];
  const e = now ?? next;
  if (!e || dismissed.includes(e.id)) return null;
  const close = () => {
    const list = [...dismissed, e.id].slice(-20);
    setDismissed(list);
    try { localStorage.setItem(DISMISSED, JSON.stringify(list)); } catch { /* private mode */ }
  };
  const range = `${Math.round(e.typical[0] * 100)}–${Math.round(e.typical[1] * 100)}%`;
  return (
    <section aria-label="Sale calendar" className={clsx("mt-3 flex min-h-11 items-center gap-2 rounded-full border pl-3.5 text-sm md:mt-4", now ? "border-sale/30 bg-sale/5" : "border-line bg-surface")}>
      {now ? <Sparkles className="h-4 w-4 shrink-0 text-sale" /> : <CalendarClock className="h-4 w-4 shrink-0" />}
      <button type="button" onClick={now ? onShowSale : onAlerts} className="min-h-11 min-w-0 flex-1 truncate rounded-full text-left" title={e.why}>
        {now ? <><b>{now.name}</b> on now · up to −{Math.round(e.typical[1] * 100)}%</> : <><b>{next!.name}</b> {next!.inDays === 1 ? "tomorrow" : `in ${next!.inDays} days`} · usually −{range}</>}
        <span className="hidden text-muted md:inline"> · {now ? `until ${fmtDate(now.end)}` : `${fmtDate(next!.start)}. Save boards with ♥ to get price-drop emails.`}</span>
      </button>
      <button type="button" onClick={now ? onShowSale : onAlerts} className="icon-btn -mr-2 hidden !text-muted hover:!bg-white hover:!text-ink sm:grid" aria-label={now ? "Show sale boards" : "Price alert settings"} title={now ? "Show sale boards" : "Price alert settings"}>
        {now ? <TrendingDown className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      </button>
      <button type="button" onClick={close} className="icon-btn !text-muted hover:!bg-white hover:!text-ink" aria-label="Dismiss sale notice"><X className="h-4 w-4" /></button>
    </section>
  );
}

/** Board page: buy now or wait for the next sale? */
export function BuyOrWait({ p, country, saved, onSave }: { p: Product; country: string; saved: boolean; onSave: () => void }) {
  const v = useMemo(() => buyOrWait({ now: new Date(), country, sport: p.board.sport, discountPct: p.discountPct, lowestIn90: p.badges.some((b) => b.kind === "lowest"), stock: p.stock.level }), [country, p]);
  if (!v) return null;
  const Icon = v.kind === "wait" ? CalendarClock : TrendingDown;
  return (
    <section aria-label="Buy now or wait" className={clsx("rounded-card border px-4 py-3 text-sm", v.kind === "wait" ? "border-line bg-surface" : "border-ok/30 bg-white")}>
      <p className={clsx("flex items-center gap-2 font-bold", v.kind !== "wait" && "text-ok")}><Icon className="h-4 w-4 shrink-0" />{v.title}</p>
      <p className="mt-1 text-muted">{v.text}</p>
      {v.kind !== "buy" && !saved && (
        <button type="button" onClick={onSave} className="btn-ghost btn-sm mt-2"><Heart className="h-4 w-4" />Save and watch the price</button>
      )}
    </section>
  );
}
