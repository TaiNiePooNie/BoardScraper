"use client";
import clsx from "clsx";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ASSETS } from "@/lib/assets";
import { countryName, SHIP_COUNTRIES } from "@/lib/countries";
import type { DealsResult } from "@/lib/deals";
import { applyFilters, DEFAULT_FILTERS, facets as getFacets, type DealFilters } from "@/lib/filters";
import { countGroupsByTier, groupDeals } from "@/lib/offers";
import { formatMoney } from "@/lib/pricing/currency";
import { currencyForCountry } from "@/lib/pricing/vat";
import { DEFAULT_PROFILE, loadHolds, loadProfile, saveHolds, saveProfile, type Profile } from "@/lib/profile";
import { CurrencyCode as Currencies, type BuyerLocale, type CurrencyCode } from "@/lib/types";
import { buildWalls } from "@/lib/walls";
import { DealTable } from "../DealTable";
import { DealTabs, type TabValue } from "../DealTabs";
import { FilterPanel } from "../FilterPanel";
import { RecommendationPanel } from "../RecommendationPanel";
import { BoardDetail, type LiveCheck } from "./BoardDetail";
import { RestockSheet } from "./RestockSheet";
import type { ShopServices } from "./services";
import { SetupFlow } from "./setup/SetupFlow";
import { ShopWall } from "./ShopWall";

const RELOAD_AFTER_MS = 10 * 60_000;

export function ShopApp({ initialLocale, services }: { initialLocale: BuyerLocale; services: ShopServices }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [setupOpen, setSetupOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [locale, setLocale] = useState({ country: initialLocale.country, currency: initialLocale.currency });
  const [result, setResult] = useState<DealsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [pro, setPro] = useState(false);
  const [proView, setProView] = useState<"walls" | "list">("walls");
  const [tab, setTab] = useState<TabValue>("all");
  const [filters, setFilters] = useState<DealFilters>(DEFAULT_FILTERS);
  const [holds, setHolds] = useState<string[]>([]);
  const [open, setOpen] = useState<{ wallId: string; groupId: string } | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);
  const [live, setLive] = useState<Record<string, LiveCheck>>({});
  const loadedAt = useRef(0);

  // Restore the saved setup; first visit opens the setup flow.
  useEffect(() => {
    const saved = loadProfile();
    if (saved) setProfile(saved);
    else setSetupOpen(true);
    setHolds(loadHolds());
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setResult(await services.loadDeals({ ...locale, rider: profile.rider }));
      loadedAt.current = Date.now();
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [services, locale, profile.rider]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  // Coming back to the tab after a while: pick up the latest prices.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current > RELOAD_AFTER_MS) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const deals = result?.deals ?? [];
  const rec = result?.recommendation ?? null;
  const filtered = useMemo(() => (pro ? applyFilters(deals, filters) : deals), [deals, filters, pro]);
  const groups = useMemo(() => groupDeals(filtered, profile.budget, profile.rider.style), [filtered, profile]);
  const walls = useMemo(() => buildWalls(groups, holds), [groups, holds]);
  const fitting = groups.filter((g) => g.budget === "in" || g.budget === "none");
  const shopCount = new Set(deals.map((d) => d.retailer.id)).size;

  const openWall = open ? walls.find((w) => w.id === open.wallId) : undefined;
  const openGroup = open ? openWall?.groups.find((g) => g.id === open.groupId) ?? groups.find((g) => g.id === open.groupId) : undefined;

  // Live price check for the board that was just opened (server only).
  useEffect(() => {
    const listingId = openGroup?.best.listing.id;
    if (!listingId || !services.liveCheck || live[listingId]) return;
    setLive((m) => ({ ...m, [listingId]: { status: "checking", message: "Checking the shop's price right now…" } }));
    services.liveCheck(listingId).then((r) => {
      setLive((m) => ({
        ...m,
        [listingId]: {
          status: !r.ok ? "failed" : r.changed ? "updated" : "fresh",
          message: r.message,
        },
      }));
      if (r.ok && r.changed) load();
    });
  }, [openGroup?.best.listing.id, services, live, load]);

  const toggleHold = (id: string) => {
    const next = holds.includes(id) ? holds.filter((h) => h !== id) : [...holds, id];
    setHolds(next);
    saveHolds(next);
  };

  const finishSetup = (p: Profile) => {
    setProfile(p);
    saveProfile(p);
    setSetupOpen(false);
    setOpen(null);
  };

  const budgetText =
    profile.budget.max === null ? "no max" : `max ${formatMoney(profile.budget.max, locale.currency)}`;

  return (
    <div className="shop-wall min-h-screen" style={{ ["--wall-url" as string]: `url(${ASSETS.wall})` }}>
      {/* header */}
      <header className="sticky z-30 border-b-2 border-paper/10 bg-asphalt/90 backdrop-blur" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <div className="app-gutter mx-auto flex max-w-7xl items-center gap-2 py-2.5">
          <img src={ASSETS.logo} alt="BoardBuddy" className="h-8 w-auto sm:h-10" />
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
            className="ml-auto flex min-w-0 items-center gap-1.5 rounded-full border-2 border-paper/20 px-3 py-1.5 text-xs font-semibold hover:border-acid sm:text-sm"
            aria-label="Edit your setup"
          >
            <span className="whitespace-nowrap">
              {rec ? `${rec.idealLengthCm}${rec.requiresWide ? "W" : ""} cm` : "Setup"}
              <span className="hidden sm:inline"> · {budgetText}</span>
            </span>
            <Pencil className="h-3.5 w-3.5 shrink-0" />
          </button>
          <button type="button" onClick={() => setRestockOpen(true)} className="shrink-0 rounded-full border-2 border-paper/20 p-1.5 hover:border-acid" aria-label="Restock (refresh prices)" title="Restock">
            <img src={ASSETS.icon.restock} alt="" className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setPro((p) => !p)}
            aria-pressed={pro}
            className={clsx("flex shrink-0 items-center gap-1 rounded-full border-2 py-1 pl-1 pr-2.5 text-xs font-bold uppercase", pro ? "border-orange bg-orange/15" : "border-paper/20 hover:border-orange")}
            title="Pro mode: filters, deal tiers and list view"
          >
            <img src={ASSETS.icon.pro} alt="" className="h-6 w-6" />Pro
          </button>
        </div>
      </header>

      {/* welcome strip */}
      <div className="app-gutter mx-auto flex max-w-7xl items-center gap-3 pt-5">
        <img src={loading && !result ? ASSETS.mascot.thinking : ASSETS.mascot.point} alt="" className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
        <div className="min-w-0">
          <p className="headline text-3xl sm:text-4xl">
            {loading && !result ? "Checking the racks…" : error ? "The shop is closed for a sec" : `${fitting.length} board${fitting.length === 1 ? "" : "s"} fit you`}
          </p>
          <p className="text-sm text-paper/70">
            {error
              ? "Couldn't load prices. Check your connection and try again."
              : rec
                ? `Ideal: ${rec.idealLengthCm}${rec.requiresWide ? "W" : ""} cm, flex ${rec.flexRange[0]}–${rec.flexRange[1]} · ${shopCount} shop${shopCount === 1 ? "" : "s"} ship to ${countryName(locale.country)}`
                : ""}
            {result?.updatedAt && !error && <span className="text-paper/45"> · prices from {new Date(result.updatedAt).toLocaleDateString()}</span>}
          </p>
          {error && <button type="button" onClick={load} className="btn-ghost mt-2 text-sm">Try again</button>}
        </div>
      </div>

      {/* pro mode tools */}
      {pro && (
        <div className="app-gutter mx-auto mt-5 flex max-w-7xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="View" className="flex rounded-xl border-2 border-paper/20 p-0.5 text-sm font-bold">
              {(["walls", "list"] as const).map((v) => (
                <button key={v} type="button" role="radio" aria-checked={proView === v} onClick={() => setProView(v)}
                  className={clsx("rounded-lg px-3 py-1.5 capitalize", proView === v ? "bg-paper text-asphalt" : "text-paper/70")}>
                  {v === "walls" ? "Shop walls" : "List & tiers"}
                </button>
              ))}
            </div>
            <label htmlFor="country" className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-paper/60">
              Ship to
              <select id="country" className="input w-auto" value={locale.country}
                onChange={(e) => setLocale({ country: e.target.value, currency: currencyForCountry(e.target.value) })}>
                {!SHIP_COUNTRIES.some((c) => c.code === locale.country) && <option value={locale.country}>{countryName(locale.country)}</option>}
                {SHIP_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </label>
            <label htmlFor="currency" className="flex items-center gap-1.5 text-xs font-semibold text-paper/60">
              Currency
              <select id="currency" className="input w-auto" value={locale.currency} onChange={(e) => setLocale((l) => ({ ...l, currency: e.target.value as CurrencyCode }))}>
                {Currencies.options.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
          {rec && <RecommendationPanel rec={rec} />}
          <details className="group">
            <summary className="cursor-pointer select-none text-sm font-bold uppercase tracking-wider text-orange">Filters</summary>
            <div className="mt-3">
              <FilterPanel value={filters} onChange={setFilters} facets={getFacets(deals)} currency={locale.currency} wideLocked={!!rec?.requiresWide} />
            </div>
          </details>
        </div>
      )}

      {/* the shop */}
      <LayoutGroup>
        <main className="mt-6 flex flex-col gap-10 pb-24">
          {pro && proView === "list" ? (
            <div className="app-gutter mx-auto flex w-full max-w-7xl flex-col gap-4">
              <DealTabs value={tab} onChange={setTab} counts={countGroupsByTier(fitting)} />
              <DealTable groups={tab === "all" ? fitting : fitting.filter((g) => g.tier === tab)} initialSort="match" />
            </div>
          ) : walls.length > 0 ? (
            walls.map((w) => (
              <ShopWall key={w.id} wall={w} selected={open?.wallId === w.id ? open.groupId : null} onSelect={(groupId) => setOpen({ wallId: w.id, groupId })} />
            ))
          ) : (
            result && !loading && (
              <div className="app-gutter mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
                <img src={ASSETS.emptyNoBoards} alt="" className="w-full max-w-sm" />
                <p className="headline text-3xl">Empty racks for your setup</p>
                <p className="text-sm text-paper/70">Nothing in stock fits your size and budget right now. Raise your budget or change your setup.</p>
                <button type="button" className="btn-acid" onClick={() => setSetupOpen(true)}>Change setup</button>
              </div>
            )
          )}
        </main>

        <AnimatePresence>
          {open && openGroup && (
            <BoardDetail
              key="detail"
              group={openGroup}
              wallId={open.wallId}
              siblings={openWall?.groups ?? [openGroup]}
              rec={rec}
              budget={profile.budget}
              held={holds.includes(openGroup.id)}
              onToggleHold={() => toggleHold(openGroup.id)}
              onNavigate={(groupId) => setOpen({ wallId: open.wallId, groupId })}
              onClose={() => setOpen(null)}
              live={live[openGroup.best.listing.id]}
            />
          )}
        </AnimatePresence>
      </LayoutGroup>

      {setupOpen && (
        <SetupFlow
          initial={profile}
          currency={locale.currency}
          onDone={finishSetup}
          onClose={loadProfile() ? () => setSetupOpen(false) : undefined}
        />
      )}
      {restockOpen && <RestockSheet services={services} onClose={() => setRestockOpen(false)} onFinished={load} />}
    </div>
  );
}
