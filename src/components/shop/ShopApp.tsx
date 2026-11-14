"use client";
import clsx from "clsx";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_ALERTS, type AlertSettings } from "@/lib/account";
import { ASSETS } from "@/lib/assets";
import { countryName, SHIP_COUNTRIES } from "@/lib/countries";
import type { DealsResult } from "@/lib/deals";
import { applyFilters, DEFAULT_FILTERS, facets as getFacets, type DealFilters } from "@/lib/filters";
import { countGroupsByTier, groupDeals, type Budget } from "@/lib/offers";
import { formatMoney } from "@/lib/pricing/currency";
import { currencyForCountry } from "@/lib/pricing/vat";
import { BROWSE_ID, DEFAULT_PROFILE, loadStore, makeBuddy, saveStore, type Buddy, type Profile, type Store } from "@/lib/profile";
import { recommend } from "@/lib/sizing";
import { CurrencyCode as Currencies, type BuyerLocale, type CurrencyCode, type FitPreference } from "@/lib/types";
import { buildWalls } from "@/lib/walls";
import { DealTable } from "../DealTable";
import { DealTabs, type TabValue } from "../DealTabs";
import { FilterPanel } from "../FilterPanel";
import { RecommendationPanel } from "../RecommendationPanel";
import { AccountPanel, type AccountState } from "./account/AccountPanel";
import { Avatar } from "./account/Avatar";
import { BuddySwitcher } from "./account/BuddySwitcher";
import { BoardDetail, type LiveCheck } from "./BoardDetail";
import { Logo } from "./Logo";
import { RestockSheet } from "./RestockSheet";
import type { ShopServices } from "./services";
import { SetupFlow } from "./setup/SetupFlow";
import { ShopWall } from "./ShopWall";

const RELOAD_AFTER_MS = 10 * 60_000;
const NO_BUDGET: Budget = { min: null, max: null };
const FIT_LABEL: Record<FitPreference, string> = { any: "All", mens: "Men", womens: "Women", kids: "Kids" };

type SetupState = { mode: "first" } | { mode: "edit"; buddyId: string } | { mode: "add" };

const firstStore = (): Store => ({
  buddies: [{ id: "me", name: "Me", avatar: 8, rider: DEFAULT_PROFILE.rider, budget: DEFAULT_PROFILE.budget }],
  activeId: "me",
  holds: [],
  alerts: DEFAULT_ALERTS,
});

export function ShopApp({ initialLocale, services }: { initialLocale: BuyerLocale; services: ShopServices }) {
  const [store, setStore] = useState<Store>(firstStore);
  const [ready, setReady] = useState(false);
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [acct, setAcct] = useState<AccountState>({ available: false, providers: { google: false, apple: false, email: false, password: false, passwordReset: false }, user: null });
  const [toast, setToast] = useState<string | null>(null);
  const [locale, setLocale] = useState({ country: initialLocale.country, currency: initialLocale.currency });
  const [result, setResult] = useState<DealsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [pro, setPro] = useState(false);
  const [proView, setProView] = useState<"walls" | "list">("walls");
  const [tab, setTab] = useState<TabValue>("all");
  const [filters, setFilters] = useState<DealFilters>(DEFAULT_FILTERS);
  const [open, setOpen] = useState<{ wallId: string; groupId: string } | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);
  const [live, setLive] = useState<Record<string, LiveCheck>>({});
  const [scrolled, setScrolled] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const loadedAt = useRef(0);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const browsing = store.activeId === BROWSE_ID;
  const active = store.buddies.find((b) => b.id === store.activeId) ?? store.buddies[0];
  const rider = browsing ? null : active.rider;
  const budget = browsing ? NO_BUDGET : active.budget;

  /* ── boot: device store, account, URL notices ───────────────────────────── */
  useEffect(() => {
    const saved = loadStore();
    if (saved) setStore(saved);
    else setSetup({ mode: "first" });

    const q = new URLSearchParams(location.search);
    const notices: Record<string, string> = {
      signedin: "You're signed in. Your riders are saved to your account.",
      unsubscribed: "Done: no more deal emails. You can turn them back on in your profile.",
      deleted: "Your account is deleted.",
    };
    const key = Object.keys(notices).find((k) => q.has(k));
    if (key) setToast(notices[key]);
    if (q.get("board")) setDeepLink(q.get("board"));
    if (q.has("profile")) setAccountOpen(true);
    if (key || q.has("board") || q.has("profile")) history.replaceState(null, "", location.pathname);

    const account = services.account;
    if (account) {
      (async () => {
        try {
          const cfg = await account.config();
          if (!cfg.enabled) return;
          const me = await account.me();
          setAcct({ available: true, providers: cfg.providers, user: me?.user ?? null });
          if (!me) return;
          if (me.data && me.data.buddies.length) {
            // Account wins; keep holds from both.
            setStore((local) => ({
              buddies: me.data!.buddies,
              activeId: me.data!.activeId && (me.data!.activeId === BROWSE_ID || me.data!.buddies.some((b) => b.id === me.data!.activeId)) ? me.data!.activeId : me.data!.buddies[0].id,
              holds: [...new Set([...me.data!.holds, ...local.holds])],
              alerts: local.alerts.enabled && !me.data!.alerts.enabled ? local.alerts : me.data!.alerts,
            }));
            setSetup(null);
          } else if (saved) {
            await account.save({ ...saved, ...localeRef.current }).catch(() => {});
          }
        } catch {
          /* accounts unavailable: guest mode */
        }
      })();
    }
    setReady(true);
  }, [services]);

  /* ── persist: device always, account when signed in ─────────────────────── */
  const persist = useCallback((next: Store) => {
    saveStore(next);
    if (acct.user && services.account) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => services.account!.save({ ...next, ...localeRef.current }).catch(() => setToast("Couldn't sync to your account; saved on this device.")), 600);
    }
  }, [acct.user, services.account]);

  const update = useCallback((fn: (s: Store) => Store) => {
    setStore((s) => {
      const next = fn(s);
      persist(next);
      return next;
    });
  }, [persist]);

  /* ── data ───────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setResult(await services.loadDeals({ ...locale, rider }));
      loadedAt.current = Date.now();
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [services, locale, rider]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current > RELOAD_AFTER_MS) load();
    };
    const onScroll = () => setScrolled(window.scrollY > 40);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("scroll", onScroll); };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const deals = result?.deals ?? [];
  const rec = result?.recommendation ?? null;
  const filtered = useMemo(() => (pro ? applyFilters(deals, filters) : deals), [deals, filters, pro]);
  const groups = useMemo(() => groupDeals(filtered, budget, rider?.style ?? null), [filtered, budget, rider]);
  const walls = useMemo(() => buildWalls(groups, store.holds, { browse: browsing }), [groups, store.holds, browsing]);
  const fitting = groups.filter((g) => g.budget === "in" || g.budget === "none");
  const shopCount = new Set(deals.map((d) => d.retailer.id)).size;

  // Deep link from an email: ?board=<boardId>
  useEffect(() => {
    if (!deepLink || !walls.length) return;
    const wall = walls.find((w) => w.groups.some((g) => g.id === deepLink));
    if (wall) setOpen({ wallId: wall.id, groupId: deepLink });
    setDeepLink(null);
  }, [deepLink, walls]);

  const openWall = open ? walls.find((w) => w.id === open.wallId) : undefined;
  const openGroup = open ? openWall?.groups.find((g) => g.id === open.groupId) ?? groups.find((g) => g.id === open.groupId) : undefined;

  useEffect(() => {
    const listingId = openGroup?.best.listing.id;
    if (!listingId || !services.liveCheck || live[listingId]) return;
    setLive((m) => ({ ...m, [listingId]: { status: "checking", message: "Checking the shop's price right now…" } }));
    services.liveCheck(listingId).then((r) => {
      setLive((m) => ({ ...m, [listingId]: { status: !r.ok ? "failed" : r.changed ? "updated" : "fresh", message: r.message } }));
      if (r.ok && r.changed) load();
    });
  }, [openGroup?.best.listing.id, services, live, load]);

  /* ── actions ────────────────────────────────────────────────────────────── */
  const toggleHold = (id: string) => update((s) => ({ ...s, holds: s.holds.includes(id) ? s.holds.filter((h) => h !== id) : [...s.holds, id] }));
  const switchTo = (id: string) => {
    setOpen(null);
    update((s) => ({ ...s, activeId: id }));
  };
  const setAlerts = (alerts: AlertSettings) => update((s) => ({ ...s, alerts }));

  const finishSetup = (p: Profile, who: { name: string; avatar: number }) => {
    const mode = setup;
    setSetup(null);
    setOpen(null);
    update((s) => {
      if (mode?.mode === "add") {
        const b = makeBuddy(who.name, who.avatar, p);
        return { ...s, buddies: [...s.buddies, b], activeId: b.id };
      }
      const id = mode?.mode === "edit" ? mode.buddyId : s.buddies[0].id;
      return { ...s, buddies: s.buddies.map((b) => (b.id === id ? { ...b, ...p, name: who.name, avatar: who.avatar } : b)), activeId: id };
    });
  };

  const summary = (b: Buddy) => {
    const r = recommend(b.rider);
    const money = b.budget.max === null ? "no max" : formatMoney(b.budget.max, locale.currency);
    return `${r.idealLengthCm}${r.requiresWide ? "W" : ""} cm · ${FIT_LABEL[b.rider.fit ?? "any"]} · ${money}`;
  };

  const setupBuddy = setup?.mode === "edit" ? store.buddies.find((b) => b.id === setup.buddyId) : setup?.mode === "first" ? store.buddies[0] : undefined;

  return (
    <div className="shop-wall min-h-screen" style={{ ["--wall-url" as string]: `url(${ASSETS.wall})` }}>
      {/* header */}
      <header className="sticky z-30 border-b-2 border-paper/10 bg-asphalt/90 backdrop-blur" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <div className="app-gutter mx-auto flex max-w-7xl items-center gap-2 py-2">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="BoardBuddy, back to top" className="shrink-0">
            <Logo height={34} compact={scrolled} />
          </button>
          <div className="ml-auto flex min-w-0 items-center gap-1.5">
            <BuddySwitcher
              buddies={store.buddies}
              activeId={store.activeId}
              onSwitch={switchTo}
              onAdd={() => setSetup({ mode: "add" })}
              onEdit={(id) => setSetup({ mode: "edit", buddyId: id })}
              summary={summary}
            />
            <button type="button" onClick={() => setPro((p) => !p)} aria-pressed={pro} title="Pro mode: filters, deal tiers and list view"
              className={clsx("shrink-0 rounded-full border-2 p-1", pro ? "border-orange bg-orange/15" : "border-paper/20 hover:border-orange")} aria-label="Pro mode">
              <img src={ASSETS.icon.pro} alt="" className="h-6 w-6" />
            </button>
            <button type="button" onClick={() => setAccountOpen(true)} className="shrink-0 rounded-full border-2 border-paper/20 p-0.5 hover:border-acid" aria-label="Your profile">
              <Avatar n={store.buddies[0].avatar} name={acct.user?.name ?? store.buddies[0].name} size={28} />
            </button>
          </div>
        </div>
      </header>

      {/* welcome strip */}
      <div className="app-gutter mx-auto flex max-w-7xl items-center gap-3 pt-5">
        <img src={loading && !result ? ASSETS.mascot.thinking : ASSETS.mascot.point} alt="" className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
        <div className="min-w-0">
          <p className="headline text-3xl sm:text-4xl">
            {loading && !result
              ? "Checking the racks…"
              : error
                ? "The shop is closed for a sec"
                : browsing
                  ? `${fitting.length} boards in the shop`
                  : `${fitting.length} board${fitting.length === 1 ? "" : "s"} fit ${active.id === store.buddies[0].id ? "you" : active.name}`}
          </p>
          <p className="text-sm text-paper/70">
            {error
              ? "Couldn't load prices. Check your connection and try again."
              : browsing
                ? `No size or budget filter · ${shopCount} shop${shopCount === 1 ? "" : "s"} ship to ${countryName(locale.country)}`
                : rec
                  ? `Ideal: ${rec.idealLengthCm}${rec.requiresWide ? "W" : ""} cm, flex ${rec.flexRange[0]}–${rec.flexRange[1]} · ${shopCount} shop${shopCount === 1 ? "" : "s"} ship to ${countryName(locale.country)}`
                  : ""}
            {result?.updatedAt && !error && <span className="text-paper/45"> · prices from {new Date(result.updatedAt).toLocaleDateString()}</span>}
          </p>
          {error && <button type="button" onClick={load} className="btn-ghost mt-2 text-sm">Try again</button>}
          {browsing && <button type="button" onClick={() => switchTo(store.buddies[0].id)} className="mt-1 text-sm font-semibold text-acid underline-offset-2 hover:underline">Shop for {store.buddies[0].name === "Me" ? "me" : store.buddies[0].name} again</button>}
        </div>
      </div>

      {/* pro mode tools */}
      {pro && (
        <div className="app-gutter mx-auto mt-5 flex max-w-7xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="View" className="flex rounded-xl border-2 border-paper/20 p-0.5 text-sm font-bold">
              {(["walls", "list"] as const).map((v) => (
                <button key={v} type="button" role="radio" aria-checked={proView === v} onClick={() => setProView(v)}
                  className={clsx("rounded-lg px-3 py-1.5", proView === v ? "bg-paper text-asphalt" : "text-paper/70")}>
                  {v === "walls" ? "Shop walls" : "List & tiers"}
                </button>
              ))}
            </div>
            {acct.user?.isOwner && (
              <button type="button" onClick={() => setRestockOpen(true)} className="flex items-center gap-1.5 rounded-xl border-2 border-paper/20 px-2.5 py-1 text-sm font-bold hover:border-acid" title="Refresh prices from the shops now (owner only)">
                <img src={ASSETS.icon.restock} alt="" className="h-5 w-5" />Restock
              </button>
            )}
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
        <main className="mt-6 flex flex-col gap-10 pb-10">
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
                <p className="headline text-3xl">Empty racks for this setup</p>
                <p className="text-sm text-paper/70">Nothing in stock fits this size and budget right now. Raise the budget, change the setup, or browse everything.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn-acid" onClick={() => setSetup({ mode: "edit", buddyId: active.id })}>Change setup</button>
                  <button type="button" className="btn-ghost" onClick={() => switchTo(BROWSE_ID)}>Browse everything</button>
                </div>
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
              budget={budget}
              held={store.holds.includes(openGroup.id)}
              onToggleHold={() => toggleHold(openGroup.id)}
              onNavigate={(groupId) => setOpen({ wallId: open.wallId, groupId })}
              onClose={() => setOpen(null)}
              live={live[openGroup.best.listing.id]}
            />
          )}
        </AnimatePresence>
      </LayoutGroup>

      <footer className="app-gutter mx-auto max-w-7xl pb-28 text-xs text-paper/45">
        Prices come from the shops and can change. ·{" "}
        <a href="/privacy" className="underline hover:text-paper">Privacy</a> ·{" "}
        <a href="/terms" className="underline hover:text-paper">Terms</a>
      </footer>

      {setup && (
        <SetupFlow
          key={setup.mode === "edit" ? setup.buddyId : setup.mode}
          initial={setupBuddy ? { rider: setupBuddy.rider, budget: setupBuddy.budget } : DEFAULT_PROFILE}
          name={setupBuddy?.name ?? ""}
          avatar={setupBuddy?.avatar ?? 1 + Math.floor(Math.random() * 7)}
          currency={locale.currency}
          onDone={finishSetup}
          onClose={setup.mode === "first" ? undefined : () => setSetup(null)}
          inbox={setup.mode === "first" && acct.available && services.account
            ? {
                account: services.account,
                providers: acct.providers,
                signedIn: !!acct.user,
                alerts: store.alerts,
                onAlerts: setAlerts,
                onPersist: (p, who) => update((s) => ({ ...s, buddies: s.buddies.map((b, i) => (i === 0 ? { ...b, ...p, ...who } : b)) })),
              }
            : undefined}
        />
      )}

      {accountOpen && (
        <AccountPanel
          account={services.account}
          state={acct}
          buddies={store.buddies}
          activeId={store.activeId}
          alerts={store.alerts}
          onAlerts={setAlerts}
          onEdit={(id) => setSetup({ mode: "edit", buddyId: id })}
          onAdd={() => setSetup({ mode: "add" })}
          onRemove={(id) => update((s) => ({ ...s, buddies: s.buddies.filter((b) => b.id !== id), activeId: s.activeId === id ? s.buddies[0].id : s.activeId }))}
          onSwitch={(id) => { switchTo(id); setAccountOpen(false); }}
          onClose={() => setAccountOpen(false)}
          summary={summary}
        />
      )}

      {restockOpen && acct.user?.isOwner && <RestockSheet services={services} onClose={() => setRestockOpen(false)} onFinished={load} />}

      {toast && (
        <div role="status" className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="sticker flex max-w-md items-center gap-3 px-4 py-3 text-sm font-semibold">
            <span>{toast}</span>
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
