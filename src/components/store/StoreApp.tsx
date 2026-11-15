"use client";
import clsx from "clsx";
import { Heart, Home, Inbox, MessageCircleQuestion, Ruler, Search, SlidersHorizontal, User, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AssetImg } from "@/components/AssetImg";
import { DEFAULT_ALERTS, type AlertSettings } from "@/lib/account";
import { ASSETS } from "@/lib/assets";
import { countryName } from "@/lib/countries";
import type { DealsResult } from "@/lib/deals";
import { BROWSE_ID, DEFAULT_PROFILE, loadStore, makeBuddy, saveStore, type Buddy, type Store } from "@/lib/profile";
import { recommendFor } from "@/lib/sizing";
import {
  activeFilterCount, buildProducts, CATEGORY_LABEL, EMPTY_FILTERS, filterProducts, SORT_LABEL, sortProducts, SPORT_LABEL, SPORT_SHORT, storeFacets,
  type Product, type SortMode, type StoreFilters,
} from "@/lib/store";
import { CATEGORIES_BY_SPORT, SPORTS, Sport as SportSchema, type BuyerLocale, type RiderInput, type Sport } from "@/lib/types";
import { AccountPanel, type AccountState } from "../shop/account/AccountPanel";
import { Avatar } from "../shop/account/Avatar";
import { Logo } from "../shop/Logo";
import { RestockSheet } from "../shop/RestockSheet";
import type { ShopServices } from "../shop/services";
import { FeedbackInbox } from "./FeedbackInbox";
import { SaleBanner } from "./SaleBanner";
import { FeedbackSheet } from "./FeedbackSheet";
import { FilterSheet } from "./FilterSheet";
import { LocaleSheet } from "./LocaleSheet";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { ProductPage, type LiveCheck } from "./ProductPage";
import { SizeSheet } from "./SizeSheet";
import { SportIcon } from "./SportIcon";

const RELOAD_AFTER_MS = 10 * 60_000;
const PAGE = 24;
const SPORT_KEY = "boardbuddy.sport";
const SIZED_KEY = "boardbuddy.sized";
const V3_KEY = "boardbuddy.v3";

const firstStore = (): Store => ({
  buddies: [{ id: "me", name: "Me", avatar: 8, rider: DEFAULT_PROFILE.rider, budget: DEFAULT_PROFILE.budget }],
  activeId: "me",
  holds: [],
  alerts: DEFAULT_ALERTS,
});

const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

const HERO_TINT: Record<Sport, string> = {
  snow: "from-[#e9f8ff] via-[#f5fbff] to-white",
  skate: "from-[#f4ffd0] via-[#fbffe9] to-white",
  surf: "from-[#ddf8ff] via-[#f0fcff] to-white",
};
const HERO_LINE: Record<Sport, string> = {
  snow: "Snowboards that fit you, at the best price.",
  skate: "Decks and completes that fit you, at the best price.",
  surf: "Surfboards with the right volume, at the best price.",
};

type View = "shop" | "saved";

export function StoreApp({ initialLocale, services }: { initialLocale: BuyerLocale; services: ShopServices }) {
  const [store, setStore] = useState<Store>(firstStore);
  const [sized, setSized] = useState(false);
  const [ready, setReady] = useState(false);
  const [sport, setSportState] = useState<Sport>("snow");
  const [view, setView] = useState<View>("shop");
  const [locale, setLocale] = useState({ country: initialLocale.country, currency: initialLocale.currency });
  const [result, setResult] = useState<DealsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<StoreFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortMode>("recommended");
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | "size" | "filters" | "locale" | "account" | "restock" | "feedback" | "inbox">(null);
  const [sizeFor, setSizeFor] = useState<string | null>(null);
  const [acct, setAcct] = useState<AccountState>({ available: false, providers: { google: false, apple: false, email: false, password: false, passwordReset: false }, user: null });
  const [toast, setToast] = useState<string | null>(null);
  const [live, setLive] = useState<Record<string, LiveCheck>>({});
  const heroArt = useArtReady(ASSETS.hero[sport]);
  const loadedAt = useRef(0);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);
  const deepLink = useRef<string | null>(null);
  const openInbox = useRef(false);

  const active = store.buddies.find((b) => b.id === store.activeId) ?? store.buddies[0];
  const rider: RiderInput | null = sized ? active.rider : null;

  /* ── boot ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const saved = loadStore();
    // Riders from the old setup wizard count as sized; in v3 only saving a size (or an account) does.
    if (saved && !safeGet(V3_KEY)) safeSet(SIZED_KEY, "1");
    safeSet(V3_KEY, "1");
    if (saved) setStore(saved.activeId === BROWSE_ID ? { ...saved, activeId: saved.buddies[0].id } : saved);
    if (safeGet(SIZED_KEY)) setSized(true);
    const sp = SportSchema.safeParse(new URLSearchParams(location.search).get("sport") ?? safeGet(SPORT_KEY));
    if (sp.success) setSportState(sp.data);

    const q = new URLSearchParams(location.search);
    const notices: Record<string, string> = {
      signedin: "You're signed in. Your riders and saved boards sync to your account.",
      unsubscribed: "Done: no more deal emails. You can turn them back on in your profile.",
      deleted: "Your account is deleted.",
    };
    const key = Object.keys(notices).find((k) => q.has(k));
    if (key) setToast(notices[key]);
    if (q.get("board")) deepLink.current = q.get("board");
    if (q.has("profile")) setSheet("account");
    if (q.has("inbox")) openInbox.current = true;
    if (key || q.has("profile") || q.has("sport") || q.has("inbox")) history.replaceState(null, "", location.pathname + (q.get("board") ? `?board=${q.get("board")}` : ""));

    const account = services.account;
    if (account) {
      (async () => {
        try {
          const cfg = await account.config();
          if (!cfg.enabled) return;
          const me = await account.me();
          setAcct({ available: true, providers: cfg.providers, user: me?.user ?? null });
          if (openInbox.current && me?.user?.isOwner) setSheet("inbox");
          if (!me) return;
          if (me.data && me.data.buddies.length) {
            setStore((local) => ({
              buddies: me.data!.buddies,
              activeId: me.data!.buddies.find((b) => b.id === me.data!.activeId)?.id ?? me.data!.buddies[0].id,
              holds: [...new Set([...me.data!.holds, ...local.holds])],
              alerts: local.alerts.enabled && !me.data!.alerts.enabled ? local.alerts : me.data!.alerts,
            }));
            setSized(true);
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

  const setSport = (s: Sport) => {
    setSportState(s);
    safeSet(SPORT_KEY, s);
    setFilters((f) => ({ ...f, category: null }));
    setShown(PAGE);
    setView("shop");
    window.scrollTo({ top: 0 });
  };

  /* ── data: every sport, unfiltered; fit is computed in the browser ───────── */
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setResult(await services.loadDeals({ ...locale, rider: null }));
      loadedAt.current = Date.now();
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [services, locale]);

  useEffect(() => { if (ready) load(); }, [ready, load]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible" && Date.now() - loadedAt.current > RELOAD_AFTER_MS) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const deals = useMemo(() => result?.deals ?? [], [result]);
  const sportCounts = useMemo(() => {
    const m: Record<Sport, Set<string>> = { snow: new Set(), skate: new Set(), surf: new Set() };
    for (const d of deals) m[d.board.sport]?.add(d.board.id);
    return { snow: m.snow.size, skate: m.skate.size, surf: m.surf.size };
  }, [deals]);
  const { products, fit } = useMemo(() => buildProducts(deals, sport, rider), [deals, sport, rider]);
  const facets = useMemo(() => storeFacets(products), [products]);
  const visible = useMemo(() => sortProducts(filterProducts(products, filters), sort), [products, filters, sort]);
  const fitCount = useMemo(() => products.filter((p) => p.fits).length, [products]);
  const shopCount = useMemo(() => new Set(deals.map((d) => d.retailer.id)).size, [deals]);

  // Saved boards: across all sports.
  const savedProducts = useMemo(() => {
    if (view !== "saved") return [];
    const out: Product[] = [];
    for (const s of SPORTS) out.push(...buildProducts(deals, s, rider).products.filter((p) => p.boardIds.some((b) => store.holds.includes(b))));
    return out;
  }, [view, deals, rider, store.holds]);

  // Product being viewed (may belong to another sport, e.g. from Saved or a link).
  const allProducts = useMemo(() => {
    if (!openId) return null;
    const owner = deals.find((d) => d.board.id === openId);
    if (!owner) return null;
    return buildProducts(deals, owner.board.sport, rider);
  }, [openId, deals, rider]);
  const openProduct = allProducts?.products.find((p) => p.boardIds.includes(openId!)) ?? null;

  /* ── product page + browser back ────────────────────────────────────────── */
  const openBoard = (id: string) => {
    setOpenId(id);
    history.pushState({ board: id }, "", `?board=${id}`);
  };
  const closeBoard = useCallback(() => {
    if (history.state?.board) history.back();
    else { setOpenId(null); history.replaceState(null, "", location.pathname); }
  }, []);
  useEffect(() => {
    const onPop = () => setOpenId(new URLSearchParams(location.search).get("board"));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (!deepLink.current || !deals.length) return;
    const id = deepLink.current;
    deepLink.current = null;
    const d = deals.find((x) => x.board.id === id);
    if (d) { setSportState(d.board.sport); setOpenId(id); }
  }, [deals]);

  useEffect(() => {
    const listingId = openProduct?.best.listing.id;
    if (!listingId || !services.liveCheck || live[listingId]) return;
    setLive((m) => ({ ...m, [listingId]: { status: "checking", message: "Checking the shop's price right now…" } }));
    services.liveCheck(listingId).then((r) => {
      setLive((m) => ({ ...m, [listingId]: { status: !r.ok ? "failed" : r.changed ? "updated" : "fresh", message: r.message, checkedAgo: r.checkedAgo, soldOut: r.inStock === false } }));
      if (r.ok && r.changed) load();
    });
  }, [openProduct?.best.listing.id, services, live, load]);

  /* ── actions ──────────────────────────────────────────────────────────── */
  /** Saved if any merged duplicate of the board was saved. */
  const isSaved = (p: Product) => p.boardIds.some((b) => store.holds.includes(b));
  const toggleSave = (p: Product) => update((s) => ({ ...s, holds: p.boardIds.some((b) => s.holds.includes(b)) ? s.holds.filter((h) => !p.boardIds.includes(h)) : [...s.holds, p.id] }));
  const setAlerts = (alerts: AlertSettings) => update((s) => ({ ...s, alerts }));
  const openSize = (buddyId?: string) => { setSizeFor(buddyId ?? active.id); setSheet("size"); };
  const sizeBuddy = store.buddies.find((b) => b.id === sizeFor) ?? active;

  const saveSize = (r: RiderInput, name: string, s: Sport) => {
    const id = sizeBuddy.id;
    update((st) => ({ ...st, buddies: st.buddies.map((b) => (b.id === id ? { ...b, rider: r, name } : b)), activeId: id }));
    setSized(true);
    safeSet(SIZED_KEY, "1");
    setSheet(null);
    if (s !== sport) setSport(s);
    setFilters((f) => ({ ...f, fitsMe: true }));
    setShown(PAGE);
  };
  const addBuddy = () => {
    const b = makeBuddy(`Buddy ${store.buddies.length}`, 1 + Math.floor(Math.random() * 7), { rider: active.rider, budget: active.budget });
    update((s) => ({ ...s, buddies: [...s.buddies, b] }));
    setSizeFor(b.id);
    setSheet("size");
  };
  const summary = (b: Buddy) => `${SPORTS.map((s) => `${SPORT_SHORT[s]} ${recommendFor(s, b.rider).label}`).join(" · ")}`;

  const searching = filters.q.trim().length > 0;
  const showHero = view === "shop" && !searching && !filters.category;
  const nFilters = activeFilterCount(filters);
  const list = view === "saved" ? savedProducts : visible;
  const firstName = active.id === store.buddies[0].id ? "you" : active.name;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      {/* ── header ── */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="app-gutter mx-auto flex h-14 max-w-7xl items-center gap-3 md:h-16">
          <button type="button" onClick={() => { setView("shop"); setFilters(EMPTY_FILTERS); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="BoardBuddy home" className="shrink-0">
            <Logo height={30} />
          </button>
          <nav aria-label="Sport" className="ml-4 hidden items-center gap-1 md:flex">
            {SPORTS.map((s) => (
              <button key={s} type="button" onClick={() => setSport(s)} aria-current={sport === s && view === "shop" ? "page" : undefined}
                className={clsx("rounded-full px-3 py-1.5 text-sm font-semibold transition", sport === s && view === "shop" ? "bg-ink text-white" : "text-ink hover:bg-surface")}>
                {SPORT_LABEL[s]}
              </button>
            ))}
          </nav>
          <SearchBox className="ml-auto hidden max-w-sm flex-1 md:flex" inputRef={searchRef} value={filters.q} onChange={(q) => { setFilters((f) => ({ ...f, q })); setView("shop"); setShown(PAGE); }} />
          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <button type="button" onClick={() => openSize()} className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:border-ink md:flex">
              <Ruler className="h-4 w-4" />{fit ? fit.label : "Find my size"}
            </button>
            <button type="button" onClick={() => setView("saved")} className="relative hidden rounded-full p-2 hover:bg-surface md:block" aria-label={`Saved boards (${store.holds.length})`}>
              <Heart className="h-5 w-5" />
              {store.holds.length > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-sale px-1 text-[10px] font-bold text-white">{store.holds.length}</span>}
            </button>
            {services.feedback && (
              <button type="button" onClick={() => setSheet("feedback")} className="rounded-full p-2 hover:bg-surface" aria-label="Feedback & support" title="Feedback & support">
                <MessageCircleQuestion className="h-5 w-5" />
              </button>
            )}
            <button type="button" onClick={() => setSheet("account")} className="rounded-full p-1 hover:bg-surface" aria-label="Your profile">
              <Avatar n={store.buddies[0].avatar} name={store.buddies[0].name} size={30} />
            </button>
          </div>
        </div>
        {/* mobile: sport tabs */}
        {view === "shop" && (
          <nav aria-label="Sport" className="app-gutter flex gap-6 md:hidden">
            {SPORTS.map((s) => (
              <button key={s} type="button" onClick={() => setSport(s)} aria-current={sport === s ? "page" : undefined}
                className={clsx("relative flex items-center gap-1.5 pb-2.5 pt-1 text-sm font-semibold", sport === s ? "text-ink" : "text-muted")}>
                <SportIcon sport={s} className="h-5 w-5" art={false} />{SPORT_SHORT[s]}
                {sport === s && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-ink" />}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="app-gutter mx-auto max-w-7xl">
        {view === "shop" && (
          <SearchBox className="mt-3 flex md:hidden" value={filters.q} onChange={(q) => { setFilters((f) => ({ ...f, q })); setShown(PAGE); }} />
        )}

        {/* ── hero ── */}
        {showHero && (
          <section className={clsx("relative mt-3 overflow-hidden rounded-3xl bg-gradient-to-br md:mt-6", HERO_TINT[sport])}>
            {heroArt && <img src={ASSETS.hero[sport]} alt="" className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-right md:block" />}
            <div className={clsx("relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-5 md:min-h-[320px] md:p-10", heroArt ? "pb-3" : "min-h-[220px]")}>
              <div className="max-w-md">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{SPORT_LABEL[sport]}</p>
                <h1 className="mt-1 text-[1.65rem] font-extrabold leading-[1.1] tracking-tight md:text-5xl">{HERO_LINE[sport]}</h1>
                <p className="mt-2 text-sm text-muted md:text-base">
                  {loading && !result ? "Checking the shops…" : `${products.length} boards from ${shopCount} shops · delivered prices to ${countryName(locale.country)}`}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {fit ? (
                    <>
                      <button type="button" className="btn-lime !py-2.5" onClick={() => { setFilters((f) => ({ ...f, fitsMe: true })); document.getElementById("grid")?.scrollIntoView({ behavior: "smooth" }); }}>
                        {fitCount} fit {firstName} · {fit.rangeLabel}
                      </button>
                      <button type="button" className="text-sm font-semibold underline underline-offset-2" onClick={() => openSize()}>Edit size</button>
                    </>
                  ) : (
                    <button type="button" className="btn-lime !py-2.5" onClick={() => openSize()}><Ruler className="h-4 w-4" />Find my size</button>
                  )}
                </div>
              </div>
              {!heroArt && <AssetImg src={ASSETS.mascotSport[sport]} alt="" className="h-28 w-28 self-end md:h-56 md:w-56" fallback={<AssetImg src={ASSETS.mascot.wave} alt="" className="h-28 w-28 self-end md:h-56 md:w-56" />} />}
            </div>
            {heroArt && <img src={ASSETS.heroMobile[sport]} alt="" className="block aspect-[2/1] w-full object-cover object-[50%_75%] md:hidden" />}
          </section>
        )}

        {/* ── sale calendar ── */}
        {view === "shop" && !searching && <SaleBanner sport={sport} country={locale.country} onShowSale={() => { setFilters((f) => ({ ...f, saleOnly: true })); document.getElementById("grid")?.scrollIntoView({ behavior: "smooth" }); }} onAlerts={() => setSheet("account")} />}

        {/* ── shop by type ── */}
        {view === "shop" && !searching && facets.categories.size > 0 && (
          <section className="mt-6" aria-label="Shop by type">
            <h2 className="mb-3 text-base font-bold md:text-lg">Shop by type</h2>
            <div className={clsx("grid gap-2", CATEGORIES_BY_SPORT[sport].length > 4 ? "grid-cols-5" : "grid-cols-4")}>
              {CATEGORIES_BY_SPORT[sport].filter((c) => facets.categories.has(c)).map((c) => {
                const on = filters.category === c;
                return (
                  <button key={c} type="button" aria-pressed={on} onClick={() => { setFilters((f) => ({ ...f, category: on ? null : c })); setShown(PAGE); }}
                    className={clsx("flex flex-col items-center gap-1 rounded-2xl border p-2 text-center transition md:p-3", on ? "border-ink bg-surface" : "border-transparent bg-surface hover:border-line")}>
                    <AssetImg src={ASSETS.type[c]} alt="" className="h-10 w-10 md:h-14 md:w-14" fallback={<SportIcon sport={sport} className="h-10 w-10 p-2 text-muted md:h-14 md:w-14" art={false} />} />
                    <span className="line-clamp-2 text-[11px] font-semibold leading-tight md:text-sm">{CATEGORY_LABEL[c]}</span>
                    <span className="text-[10px] text-muted md:text-xs">{facets.categories.get(c)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── toolbar ── */}
        <div id="grid" className={clsx("sticky top-[calc(env(safe-area-inset-top,0px)+5.75rem)] z-30 -mx-4 flex items-center gap-2 bg-white/95 px-4 py-2.5 backdrop-blur md:top-16 md:mx-0 md:px-0", showHero || facets.categories.size ? "mt-6" : "mt-2")}>
          <h2 className="min-w-0 flex-1 truncate text-base font-bold md:text-lg">
            {view === "saved" ? `Saved (${list.length})` : filters.category ? CATEGORY_LABEL[filters.category] : searching ? `Results for “${filters.q.trim()}”` : `All ${SPORT_LABEL[sport].toLowerCase()}`}
            {view === "shop" && <span className="ml-2 text-sm font-medium text-muted">{visible.length}</span>}
          </h2>
          {view === "shop" ? (
            <>
              {fit && (
                <button type="button" aria-pressed={filters.fitsMe} onClick={() => setFilters((f) => ({ ...f, fitsMe: !f.fitsMe }))} className="chip shrink-0">Fits me</button>
              )}
              <label className="hidden items-center gap-2 text-sm md:flex">
                <span className="text-muted">Sort</span>
                <select className="input !w-auto !py-1.5" value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
                  {(Object.keys(SORT_LABEL) as SortMode[]).map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => setSheet("filters")} className="chip flex shrink-0 items-center gap-1.5" aria-label={`Filter and sort${nFilters ? `, ${nFilters} active` : ""}`}>
                <SlidersHorizontal className="h-4 w-4" />Filter{nFilters > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] text-white">{nFilters}</span>}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setView("shop")} className="chip shrink-0">Back to shop</button>
          )}
        </div>

        {/* ── grid ── */}
        {error ? (
          <Empty art={ASSETS.mascot.shrug} title="The shop is closed for a sec" text="Couldn't load prices. Check your connection and try again." action={<button type="button" className="btn-primary" onClick={load}>Try again</button>} />
        ) : loading && !result ? (
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
        ) : list.length === 0 ? (
          view === "saved" ? (
            <Empty art={ASSETS.emptySaved} fallbackArt={ASSETS.mascot.thinking} title="No saved boards yet" text="Tap the heart on any board to keep it here. We'll tell you when it gets cheaper." action={<button type="button" className="btn-primary" onClick={() => setView("shop")}>Browse boards</button>} />
          ) : products.length === 0 ? (
            <Empty art={ASSETS.mascotSport[sport]} fallbackArt={ASSETS.mascot.thinking} title={`${SPORT_LABEL[sport]} are on their way`} text={`We're adding ${SPORT_LABEL[sport].toLowerCase()} from the shops. Check back soon, or browse ${sport === "snow" ? "skate" : "snow"} in the meantime.`} />
          ) : (
            <Empty art={ASSETS.emptySearch} fallbackArt={ASSETS.emptyNoBoards} title="Nothing matches" text="Try fewer filters or a different search." action={<button type="button" className="btn-primary" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>} />
          )
        ) : (
          <>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
              {list.slice(0, view === "saved" ? undefined : shown).map((p, i) => (
                <ProductCard key={p.id} p={p} priority={i < 4} saved={isSaved(p)} onOpen={() => openBoard(p.id)} onToggleSave={() => toggleSave(p)} />
              ))}
            </div>
            {view === "shop" && visible.length > shown && (
              <div className="mt-10 flex flex-col items-center gap-2">
                <p className="text-sm text-muted">Showing {shown} of {visible.length}</p>
                <div className="h-1 w-48 overflow-hidden rounded-full bg-line"><div className="h-full bg-ink" style={{ width: `${(shown / visible.length) * 100}%` }} /></div>
                <button type="button" className="btn-ghost mt-2 px-8" onClick={() => setShown((n) => n + PAGE)}>Show more</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── footer ── */}
      <footer className="app-gutter mx-auto mt-16 max-w-7xl border-t border-line py-8 text-sm text-muted">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" onClick={() => setSheet("locale")} className="font-semibold text-ink underline underline-offset-2">Ship to {countryName(locale.country)} · {locale.currency}</button>
          {result?.updatedAt && <span>Prices from {new Date(result.updatedAt).toLocaleDateString()}</span>}
          {services.feedback && <button type="button" onClick={() => setSheet("feedback")} className="font-semibold text-ink underline underline-offset-2">Feedback & support</button>}
          {acct.user?.isOwner && services.feedback && <button type="button" onClick={() => setSheet("inbox")} className="font-semibold text-ink underline underline-offset-2">Feedback inbox</button>}
          {acct.user?.isOwner && <button type="button" onClick={() => setSheet("restock")} className="font-semibold text-ink underline underline-offset-2">Restock now</button>}
          <span className="ml-auto flex gap-4"><a href="/privacy" className="hover:text-ink">Privacy</a><a href="/terms" className="hover:text-ink">Terms</a></span>
        </div>
        <p className="mt-3 text-xs">Prices come from the shops and can change. We may earn nothing from these links; we just like a good deal.</p>
      </footer>

      {/* ── mobile bottom nav ── */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="grid grid-cols-4">
          {([
            ["shop", "Shop", Home, () => { setView("shop"); window.scrollTo({ top: 0, behavior: "smooth" }); }],
            ["saved", "Saved", Heart, () => { setView("saved"); window.scrollTo({ top: 0 }); }],
            ["size", fit ? fit.label : "My size", Ruler, () => openSize()],
            ["account", "Profile", User, () => setSheet("account")],
          ] as const).map(([id, label, Icon, go]) => {
            const on = id === view || (id === "size" && sheet === "size") || (id === "account" && sheet === "account");
            return (
              <button key={id} type="button" onClick={go} aria-current={on ? "page" : undefined} className={clsx("relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", on ? "text-ink" : "text-muted")}>
                <Icon className={clsx("h-[22px] w-[22px]", on && id === "saved" && "fill-ink")} />
                <span className="max-w-full truncate px-1">{label}</span>
                {id === "saved" && store.holds.length > 0 && <span className="absolute left-1/2 top-1 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-sale px-1 text-[10px] font-bold text-white">{store.holds.length}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── overlays ── */}
      {openProduct && (
        <ProductPage
          p={openProduct}
          fit={allProducts?.fit ?? null}
          saved={isSaved(openProduct)}
          onToggleSave={() => toggleSave(openProduct)}
          onClose={closeBoard}
          onEditSize={() => openSize()}
          live={live[openProduct.best.listing.id]}
          shipTo={countryName(locale.country)}
          country={locale.country}
        />
      )}
      {sheet === "size" && (
        <SizeSheet
          key={sizeBuddy.id}
          sport={sport}
          buddy={sizeBuddy}
          buddies={store.buddies}
          onSave={saveSize}
          onSwitchBuddy={(id) => setSizeFor(id)}
          onAddBuddy={addBuddy}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "filters" && (
        <FilterSheet sport={sport} value={filters} onChange={(f) => { setFilters(f); setShown(PAGE); }} sort={sort} onSort={setSort} facets={facets} currency={locale.currency} hasRider={!!fit} fitLabel={fit?.rangeLabel ?? null} count={visible.length} onClose={() => setSheet(null)} />
      )}
      {sheet === "locale" && <LocaleSheet value={locale} onChange={setLocale} onClose={() => setSheet(null)} />}
      {sheet === "account" && (
        <AccountPanel
          account={services.account}
          state={acct}
          buddies={store.buddies}
          activeId={store.activeId}
          alerts={store.alerts}
          onAlerts={setAlerts}
          onEdit={(id) => openSize(id)}
          onAdd={addBuddy}
          onRemove={(id) => update((s) => ({ ...s, buddies: s.buddies.filter((b) => b.id !== id), activeId: s.activeId === id ? s.buddies[0].id : s.activeId }))}
          onSwitch={(id) => { update((s) => ({ ...s, activeId: id })); setSheet(null); }}
          onClose={() => setSheet(null)}
          summary={summary}
          extra={services.feedback ? (
            <section className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setSheet("feedback")} className="btn-ghost flex-1 !justify-start !py-3"><MessageCircleQuestion className="h-5 w-5" />Feedback & support</button>
              {acct.user?.isOwner && <button type="button" onClick={() => setSheet("inbox")} className="btn-ghost flex-1 !justify-start !py-3"><Inbox className="h-5 w-5" />Feedback inbox</button>}
            </section>
          ) : undefined}
        />
      )}
      {sheet === "feedback" && services.feedback && (
        <FeedbackSheet
          service={services.feedback}
          email={acct.user?.email}
          page={{ view, sport, board: openId ?? undefined, signedIn: !!acct.user }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "inbox" && services.feedback && acct.user?.isOwner && <FeedbackInbox service={services.feedback} onClose={() => setSheet(null)} />}
      {sheet === "restock" && acct.user?.isOwner && <RestockSheet services={services} onClose={() => setSheet(null)} onFinished={load} />}

      {toast && (
        <div role="status" className="fixed inset-x-0 bottom-20 z-[70] flex justify-center px-4 md:bottom-6">
          <div className="flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-xl">
            <span>{toast}</span>
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/** True once an art file has loaded (false while missing), so layouts can fall back. */
const artCache = new Map<string, boolean>();
function useArtReady(src: string): boolean {
  const [ok, setOk] = useState(() => artCache.get(src) ?? false);
  useEffect(() => {
    if (artCache.has(src)) { setOk(artCache.get(src)!); return; }
    setOk(false);
    let alive = true;
    const img = new Image();
    img.onload = () => { artCache.set(src, img.naturalWidth > 0); if (alive) setOk(img.naturalWidth > 0); };
    img.onerror = () => { artCache.set(src, false); if (alive) setOk(false); };
    img.src = src;
    return () => { alive = false; };
  }, [src]);
  return ok;
}

function SearchBox({ value, onChange, className, inputRef }: { value: string; onChange: (q: string) => void; className?: string; inputRef?: React.Ref<HTMLInputElement> }) {
  return (
    <label className={clsx("relative items-center", className)}>
      <span className="sr-only">Search boards</span>
      <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted" />
      <input ref={inputRef} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search brands and models"
        className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-10 text-[15px] outline-none transition placeholder:text-muted focus:border-ink focus:bg-white md:h-10 md:text-sm" />
      {value && <button type="button" onClick={() => onChange("")} className="absolute right-2 rounded-full p-1.5 hover:bg-line" aria-label="Clear search"><X className="h-4 w-4" /></button>}
    </label>
  );
}

function Empty({ art, fallbackArt, title, text, action }: { art: string; fallbackArt?: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
      <AssetImg src={art} alt="" className="h-40 w-auto" fallback={fallbackArt ? <AssetImg src={fallbackArt} alt="" className="h-40 w-auto" /> : null} />
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}
