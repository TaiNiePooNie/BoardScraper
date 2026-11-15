"use client";
import clsx from "clsx";
import { Check, Heart, Home, Inbox, MessageCircleQuestion, Ruler, Search, SlidersHorizontal, User, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AssetImg } from "@/components/AssetImg";
import { DEFAULT_ALERTS, type AlertSettings } from "@/lib/account";
import { ASSETS } from "@/lib/assets";
import { countryName } from "@/lib/countries";
import type { DealsResult } from "@/lib/deals";
import { BROWSE_ID, DEFAULT_PROFILE, loadStore, makeBuddy, saveStore, type Buddy, type Store } from "@/lib/profile";
import { recommendFor } from "@/lib/sizing";
import {
  activeFilterCount, buildProducts, CATEGORY_LABEL, EMPTY_FILTERS, filterProducts, MIN_DISCOUNT, SORT_LABEL, sortProducts, SPORT_LABEL, SPORT_SHORT, storeFacets, viewFromQuery, viewToQuery,
  type Product, type SortMode, type StoreFilters,
} from "@/lib/store";
import { CATEGORIES_BY_SPORT, SPORTS, Sport as SportSchema, type BuyerLocale, type RiderInput, type Sport } from "@/lib/types";
import type { ShopServices } from "../shop/services";
import { AccountSheet, type AccountState } from "./account/AccountSheet";
import { Avatar } from "./account/Avatar";
import { FeedbackInbox } from "./FeedbackInbox";
import { FeedbackSheet } from "./FeedbackSheet";
import { discountLabel, FilterSheet } from "./FilterSheet";
import { LocaleSheet } from "./LocaleSheet";
import { Logo } from "./Logo";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { ProductPage, type LiveCheck } from "./ProductPage";
import { RestockSheet } from "./RestockSheet";
import { SaleBanner } from "./SaleBanner";
import { SizeSheet } from "./size/SizeSheet";
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

/** Smooth scrolling, unless the visitor asked their device for less motion. */
const scrollBehavior = (): ScrollBehavior => (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

const HERO_TINT: Record<Sport, string> = {
  snow: "from-ice/15 via-ice/5 to-white",
  skate: "from-acid/35 via-acid/10 to-white",
  surf: "from-ice/25 via-ice/10 to-white",
};
const HERO_LINE: Record<Sport, string> = {
  snow: "Snowboards that fit you, at the best price.",
  skate: "Decks and completes that fit you, at the best price.",
  surf: "Surfboards with the right volume, at the best price.",
};

type View = "shop" | "saved";

/** One-tap filters above the grid; each maps to a price/stock badge on the cards. */
type QuickKey = "sale" | "drop" | "lowest" | "last" | "fits";
const QUICK: { key: QuickKey; label: (f: StoreFilters) => string; on: (f: StoreFilters) => boolean; set: (f: StoreFilters, on: boolean) => StoreFilters }[] = [
  { key: "sale", label: (f) => (f.minDiscount > MIN_DISCOUNT ? discountLabel(f.minDiscount) : "On sale"), on: (f) => f.minDiscount > 0, set: (f, on) => ({ ...f, minDiscount: on ? Math.max(f.minDiscount, MIN_DISCOUNT) : 0 }) },
  { key: "drop", label: () => "Price dropped", on: (f) => f.priceDrop, set: (f, on) => ({ ...f, priceDrop: on }) },
  { key: "lowest", label: () => "Lowest in 90 days", on: (f) => f.lowest, set: (f, on) => ({ ...f, lowest: on }) },
  { key: "last", label: () => "Last sizes", on: (f) => f.lastSizes, set: (f, on) => ({ ...f, lastSizes: on }) },
  { key: "fits", label: () => "Fits me", on: (f) => f.fitsMe, set: (f, on) => ({ ...f, fitsMe: on }) },
];

/** The shop lives at "/" (or wherever the static page is); /board/<id> links open it on that board. */
const basePath = () => (location.pathname.startsWith("/board/") ? "/" : location.pathname);

export function StoreApp({ initialLocale, services, initialBoardId }: { initialLocale: BuyerLocale; services: ShopServices; initialBoardId?: string }) {
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
  // The floating size pill slides away while you scroll down the list and returns when you scroll up.
  const [pillHidden, setPillHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 12) return;
      setPillHidden(y > last && y > 160);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  /** `?board=<id>` from the address bar, opened once the deals have loaded. */
  const [pendingBoard, setPendingBoard] = useState<string | null>(null);
  const openInbox = useRef(false);
  const urlTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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
    // The address bar wins (shared or bookmarked view); else the sport from last time.
    const q = new URLSearchParams(location.search);
    const fromUrl = viewFromQuery(q);
    const sp = SportSchema.safeParse(fromUrl.sport ?? safeGet(SPORT_KEY));
    if (sp.success) setSportState(sp.data);
    setFilters(fromUrl.filters);
    setSort(fromUrl.sort);

    const notices: Record<string, string> = {
      signedin: "You're signed in. Your riders and saved boards sync to your account.",
      unsubscribed: "Done: no more deal emails. You can turn them back on in your profile.",
      deleted: "Your account is deleted.",
    };
    const key = Object.keys(notices).find((k) => q.has(k));
    if (key) setToast(notices[key]);
    if (q.get("board") ?? initialBoardId) setPendingBoard(q.get("board") ?? initialBoardId!);
    if (q.has("profile")) setSheet("account");
    if (q.has("inbox")) openInbox.current = true;
    // One-off params (signedin, profile, …) drop out when the view is written back to the URL below.

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
    // Types and brands belong to one sport; deal filters and search carry over.
    setFilters((f) => ({ ...f, category: null, brands: [] }));
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
  /** How many boards each quick filter would leave, given the other filters. */
  const quickCounts = useMemo(() => {
    const out = {} as Record<QuickKey, number>;
    for (const c of QUICK) out[c.key] = c.on(filters) ? visible.length : filterProducts(products, c.set(filters, true)).length;
    return out;
  }, [products, filters, visible.length]);
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

  /* ── URL state ──────────────────────────────────────────────────────────
   * Sport, type, search, sort and filters live in the query string (replaceState: no reload,
   * no extra history entries), so a view can be shared, bookmarked and survives a reload.
   * `?board=<id>` is the open product; opening one pushes a history entry so Back closes it. */
  const viewUrl = useCallback((board: string | null) => {
    const q = viewToQuery({ sport, filters, sort });
    if (board) q.set("board", board);
    return `${basePath()}?${q}`;
  }, [sport, filters, sort]);
  useEffect(() => {
    if (!ready) return;
    clearTimeout(urlTimer.current);
    // Debounced: typing in search must not hit the browser's replaceState rate limit.
    urlTimer.current = setTimeout(() => {
      const url = viewUrl(openId ?? pendingBoard);
      if (url === location.pathname + location.search) return;
      try { history.replaceState(history.state, "", url); } catch { /* rate-limited: the next change catches up */ }
    }, 200);
    return () => clearTimeout(urlTimer.current);
  }, [ready, viewUrl, openId, pendingBoard]);

  /* ── product page + browser back ────────────────────────────────────────── */
  const openBoard = (id: string) => {
    setOpenId(id);
    try { history.pushState({ board: id }, "", viewUrl(id)); } catch { /* sandboxed page: the product still opens, Back just leaves */ }
  };
  const closeBoard = useCallback(() => {
    if (history.state?.board) history.back();
    else setOpenId(null); // opened from a link: stay on the site, the URL effect drops ?board
  }, []);
  useEffect(() => {
    const onPop = () => setOpenId(new URLSearchParams(location.search).get("board"));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (!pendingBoard || !deals.length) return;
    const d = deals.find((x) => x.board.id === pendingBoard);
    if (d) { setSportState(d.board.sport); setOpenId(pendingBoard); }
    setPendingBoard(null);
  }, [deals, pendingBoard]);

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
  const changeFilters = (fn: (f: StoreFilters) => StoreFilters) => { setFilters(fn); setShown(PAGE); };
  const toGrid = () => document.getElementById("grid")?.scrollIntoView({ behavior: scrollBehavior() });
  const goHome = () => { setView("shop"); setFilters(EMPTY_FILTERS); setSort("recommended"); setShown(PAGE); window.scrollTo({ top: 0, behavior: scrollBehavior() }); };
  const title = view === "saved" ? "Saved boards" : filters.category ? CATEGORY_LABEL[filters.category] : searching ? `Results for “${filters.q.trim()}”` : `All ${SPORT_LABEL[sport].toLowerCase()}`;
  const firstLoad = loading && !result;
  const otherSport: Sport = sport === "snow" ? "skate" : "snow";

  return (
    <div className="min-h-screen bg-white pb-36 md:pb-0">
      {/* ── header ── */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="app-gutter mx-auto flex h-14 max-w-7xl items-center gap-2 md:h-16 md:gap-3">
          <button type="button" onClick={goHome} aria-label="BoardBuddy home" className="flex min-h-11 shrink-0 items-center rounded-control">
            <Logo height={30} />
          </button>
          <nav aria-label="Sport" className="ml-4 hidden items-center gap-1 md:flex">
            {SPORTS.map((s) => (
              <button key={s} type="button" onClick={() => setSport(s)} aria-current={sport === s && view === "shop" ? "page" : undefined}
                className={clsx("min-h-9 rounded-full px-3 text-sm font-semibold transition", sport === s && view === "shop" ? "bg-ink text-white" : "text-ink hover:bg-surface")}>
                {SPORT_LABEL[s]}
              </button>
            ))}
          </nav>
          <SearchBox className="ml-auto hidden max-w-sm flex-1 md:flex" value={filters.q} onChange={(q) => { changeFilters((f) => ({ ...f, q })); setView("shop"); }} />
          <div className="-mr-2 ml-auto flex items-center md:ml-1 md:mr-0">
            <button type="button" onClick={() => openSize()} className="chip mr-1 !hidden font-semibold md:!inline-flex">
              <Ruler className="h-4 w-4" />{fit ? fit.label : "Find my size"}
            </button>
            <button type="button" onClick={() => { setView("saved"); window.scrollTo({ top: 0 }); }} className="icon-btn relative !hidden md:!grid" aria-label={`Saved boards (${store.holds.length})`}>
              <Heart className="h-5 w-5" />
              {store.holds.length > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-sale px-1 text-2xs font-bold text-white">{store.holds.length}</span>}
            </button>
            {services.feedback && (
              <button type="button" onClick={() => setSheet("feedback")} className="icon-btn" aria-label="Feedback & support" title="Feedback & support">
                <MessageCircleQuestion className="h-5 w-5" />
              </button>
            )}
            <button type="button" onClick={() => setSheet("account")} className="icon-btn" aria-label="Your profile">
              <Avatar n={store.buddies[0].avatar} name={store.buddies[0].name} size={30} />
            </button>
          </div>
        </div>
        {/* phones: sport tabs */}
        {view === "shop" && (
          <nav aria-label="Sport" className="app-gutter flex gap-6 md:hidden">
            {SPORTS.map((s) => (
              <button key={s} type="button" onClick={() => setSport(s)} aria-current={sport === s ? "page" : undefined}
                className={clsx("relative flex h-11 items-center gap-1.5 text-sm font-semibold", sport === s ? "text-ink" : "text-muted")}>
                <SportIcon sport={s} className="h-5 w-5" art={false} />{SPORT_SHORT[s]}
                {sport === s && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-ink" />}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="app-gutter mx-auto max-w-7xl">
        {view === "shop" && (
          <SearchBox className="mt-3 flex md:hidden" value={filters.q} onChange={(q) => changeFilters((f) => ({ ...f, q }))} />
        )}

        {/* ── hero (desktop; phones get the floating size pill instead) ── */}
        {showHero && (
          <section aria-label={SPORT_LABEL[sport]} className={clsx("relative mt-6 hidden overflow-hidden rounded-sheet bg-gradient-to-br md:block", HERO_TINT[sport])}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {heroArt && <img src={ASSETS.hero[sport]} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right" />}
            <div className="relative grid min-h-[320px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-10">
              <div className="max-w-md">
                <p className="label">{SPORT_LABEL[sport]}</p>
                <p className="mt-1 text-5xl font-extrabold leading-[1.1] tracking-tight">{HERO_LINE[sport]}</p>
                <p className="mt-2 text-base text-muted">
                  {firstLoad ? "Checking the shops…" : `${products.length} boards from ${shopCount} shops · delivered prices to ${countryName(locale.country)}`}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {fit ? (
                    <>
                      <button type="button" className="btn-lime" onClick={() => { changeFilters((f) => ({ ...f, fitsMe: true })); toGrid(); }}>
                        {fitCount} fit {firstName} · {fit.rangeLabel}
                      </button>
                      <button type="button" className="link text-sm" onClick={() => openSize()}>Edit size</button>
                    </>
                  ) : (
                    <button type="button" className="btn-lime" onClick={() => openSize()}><Ruler className="h-4 w-4" />Find my size</button>
                  )}
                </div>
              </div>
              {!heroArt && <AssetImg src={ASSETS.mascotSport[sport]} alt="" className="h-56 w-56 self-end" fallback={<AssetImg src={ASSETS.mascot.wave} alt="" className="h-56 w-56 self-end" />} />}
            </div>
          </section>
        )}

        {/* ── sale calendar ── */}
        {view === "shop" && !searching && <SaleBanner sport={sport} country={locale.country} onShowSale={() => { changeFilters((f) => ({ ...f, minDiscount: Math.max(f.minDiscount, MIN_DISCOUNT) })); toGrid(); }} onAlerts={() => setSheet("account")} />}

        {/* ── shop by type ── */}
        {view === "shop" && !searching && facets.categories.size > 0 && (
          <section className="mt-5 md:mt-6" aria-label="Shop by type">
            <h2 className="mb-2 text-base font-bold md:mb-3 md:text-lg">Shop by type</h2>
            {/* phones: one swipeable line, so long names ("Longboards") never break mid-word */}
            <div className={clsx("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:overflow-visible sm:px-0", CATEGORIES_BY_SPORT[sport].length > 4 ? "sm:grid-cols-5" : "sm:grid-cols-4")}>
              {CATEGORIES_BY_SPORT[sport].filter((c) => facets.categories.has(c)).map((c) => {
                const on = filters.category === c;
                return (
                  <button key={c} type="button" aria-pressed={on} onClick={() => changeFilters((f) => ({ ...f, category: on ? null : c }))}
                    className={clsx("flex w-[5.25rem] shrink-0 flex-col items-center gap-1 rounded-card border px-1 py-2 text-center transition sm:w-auto sm:min-w-0 sm:shrink md:p-3", on ? "border-ink bg-surface" : "border-transparent bg-surface hover:border-line")}>
                    <AssetImg src={ASSETS.type[c]} alt="" className="h-10 w-10 md:h-14 md:w-14" fallback={<SportIcon sport={sport} className="h-10 w-10 p-2 text-muted md:h-14 md:w-14" art={false} />} />
                    <span className="line-clamp-2 max-w-full text-2xs font-semibold leading-tight md:text-sm">{CATEGORY_LABEL[c]}</span>
                    <span className="text-2xs text-muted md:text-xs">{facets.categories.get(c)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── title ── */}
        <div id="grid" className="mt-5 flex min-h-11 scroll-mt-28 items-center gap-3 md:mt-8 md:scroll-mt-20">
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold md:text-xl">
            {title}
            {result && <span className="ml-2 text-sm font-medium text-muted">{list.length}</span>}
          </h1>
          {view === "shop" ? (
            <label className="hidden shrink-0 items-center gap-2 text-sm md:flex">
              <span className="text-muted">Sort</span>
              <select className="input !w-auto" value={sort} onChange={(e) => { setSort(e.target.value as SortMode); setShown(PAGE); }}>
                {(Object.keys(SORT_LABEL) as SortMode[]).map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
              </select>
            </label>
          ) : (
            <button type="button" onClick={() => setView("shop")} className="chip">Back to shop</button>
          )}
        </div>

        {/* ── quick filters: one sticky line, scrolls sideways ── */}
        {view === "shop" && (
          <div className="sticky top-[calc(env(safe-area-inset-top,0px)+6.25rem)] z-30 -mx-4 flex items-center bg-white/95 py-2 backdrop-blur md:top-16 md:mx-0">
            <div className="shrink-0 pl-4 pr-2 md:pl-0">
              <button type="button" onClick={() => setSheet("filters")} className="chip font-semibold" aria-label={`Filter and sort${nFilters ? `, ${nFilters} active` : ""}`}>
                <SlidersHorizontal className="h-4 w-4" />Filter{nFilters > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-2xs font-bold text-white">{nFilters}</span>}
              </button>
            </div>
            <div role="group" aria-label="Quick filters" className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto border-l border-line pl-2 pr-4 md:pr-0">
              {QUICK.filter((c) => c.key !== "fits" || fit).map((c) => {
                const on = c.on(filters);
                const n = quickCounts[c.key];
                return (
                  <button key={c.key} type="button" aria-pressed={on} disabled={!on && n === 0 && !!result} onClick={() => changeFilters((f) => c.set(f, !on))} className="chip disabled:opacity-50 disabled:hover:border-line">
                    {c.label(filters)}{result && !on && <span className="text-xs text-muted">{n}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <p className="sr-only" role="status" aria-live="polite">{!result ? "Loading boards" : `${list.length} board${list.length === 1 ? "" : "s"} shown`}</p>

        {/* ── grid ── */}
        {error && result && view === "shop" && (
          <p className="note-warn mt-1 items-center" role="alert">
            <span className="flex-1">Couldn&apos;t refresh the prices just now. You&apos;re seeing the last ones we loaded.</span>
            <button type="button" className="link shrink-0 !text-warn" onClick={load}>Try again</button>
          </p>
        )}
        {error && !result ? (
          <Empty art={ASSETS.mascot.shrug} title="Couldn't load the boards" text="The prices didn't come through. Check your connection and try again." action={<button type="button" className="btn-primary" onClick={load} disabled={loading}>{loading ? "Trying…" : "Try again"}</button>} />
        ) : firstLoad || !result ? (
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
        ) : list.length === 0 ? (
          view === "saved" ? (
            <Empty art={ASSETS.emptySaved} fallbackArt={ASSETS.mascot.thinking} title="No saved boards yet" text="Tap the heart on any board to keep it here. We'll tell you when it gets cheaper." action={<button type="button" className="btn-primary" onClick={() => setView("shop")}>Browse boards</button>} />
          ) : products.length === 0 ? (
            <Empty art={ASSETS.mascotSport[sport]} fallbackArt={ASSETS.mascot.thinking} title={`${SPORT_LABEL[sport]} are on their way`} text={`We're adding ${SPORT_LABEL[sport].toLowerCase()} from the shops. Check back soon.`}
              action={sportCounts[otherSport] > 0 ? <button type="button" className="btn-primary" onClick={() => setSport(otherSport)}>Browse {SPORT_LABEL[otherSport].toLowerCase()}</button> : undefined} />
          ) : (
            <Empty art={ASSETS.emptySearch} fallbackArt={ASSETS.emptyNoBoards} title="Nothing matches" text={searching ? `No ${SPORT_LABEL[sport].toLowerCase()} match “${filters.q.trim()}” with these filters.` : "No boards match all of these filters. Try removing one."}
              action={<button type="button" className="btn-primary" onClick={() => changeFilters(() => EMPTY_FILTERS)}>Clear search and filters</button>} />
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
                <div className="h-1 w-48 overflow-hidden rounded-full bg-line" aria-hidden><div className="h-full bg-ink" style={{ width: `${(shown / visible.length) * 100}%` }} /></div>
                <button type="button" className="btn-ghost mt-2 px-8" onClick={() => setShown((n) => n + PAGE)}>Show more</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── footer ── */}
      <footer className="app-gutter mx-auto mt-16 max-w-7xl border-t border-line py-6 text-sm text-muted">
        <div className="flex flex-wrap items-center gap-x-5">
          <button type="button" onClick={() => setSheet("locale")} className="link min-h-11">Ship to {countryName(locale.country)} · {locale.currency}</button>
          {services.feedback && <button type="button" onClick={() => setSheet("feedback")} className="link min-h-11">Feedback & support</button>}
          {acct.user?.isOwner && services.feedback && <button type="button" onClick={() => setSheet("inbox")} className="link min-h-11">Feedback inbox</button>}
          {acct.user?.isOwner && <button type="button" onClick={() => setSheet("restock")} className="link min-h-11">Restock now</button>}
          <span className="flex gap-5 md:ml-auto">
            <a href="/privacy" className="flex min-h-11 items-center hover:text-ink hover:underline">Privacy</a>
            <a href="/terms" className="flex min-h-11 items-center hover:text-ink hover:underline">Terms</a>
          </span>
        </div>
        <p className="mt-2 text-xs">
          {result?.updatedAt && <>Prices from {new Date(result.updatedAt).toLocaleDateString()}. </>}
          Prices come from the shops and can change. We may earn nothing from these links; we just like a good deal.
        </p>
      </footer>

      {/* ── phones: small floating size pill (replaces the hero card) ── */}
      {view === "shop" && !openProduct && !sheet && visible.length > 0 && (
        <div className={clsx("pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 transition duration-200 md:hidden", pillHidden && "translate-y-24 opacity-0")} style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.25rem)" }}>
          {fit ? (
            <div className="pointer-events-auto flex max-w-full items-center overflow-hidden rounded-full border border-line bg-white text-sm font-semibold shadow-float">
              <button type="button" aria-pressed={filters.fitsMe} onClick={() => changeFilters((f) => ({ ...f, fitsMe: !f.fitsMe }))}
                className={clsx("flex min-h-11 min-w-0 items-center gap-1.5 pl-3.5 pr-3 focus-visible:outline-offset-[-2px]", filters.fitsMe ? "bg-ink text-white" : "text-ink")}>
                <span aria-hidden className={clsx("grid h-4 w-4 shrink-0 place-items-center rounded-full border", filters.fitsMe ? "border-acid bg-acid text-ink" : "border-muted")}>{filters.fitsMe && <Check className="h-3 w-3" />}</span>
                <span className="truncate">{filters.fitsMe ? `${fitCount} fit ${firstName}` : "Only my size"} · {fit.rangeLabel}</span>
              </button>
              <button type="button" onClick={() => openSize()} className="grid min-h-11 w-11 shrink-0 place-items-center border-l border-line text-muted focus-visible:outline-offset-[-2px]" aria-label="Edit my size"><Ruler className="h-4 w-4" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => openSize()} className="btn-lime pointer-events-auto shadow-float"><Ruler className="h-4 w-4" />Find my size</button>
          )}
        </div>
      )}

      {/* ── phones: bottom nav ── */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="grid grid-cols-4">
          {([
            ["shop", "Shop", Home, () => { setView("shop"); window.scrollTo({ top: 0, behavior: scrollBehavior() }); }],
            ["saved", "Saved", Heart, () => { setView("saved"); window.scrollTo({ top: 0 }); }],
            ["size", fit ? fit.label : "My size", Ruler, () => openSize()],
            ["account", "Profile", User, () => setSheet("account")],
          ] as const).map(([id, label, Icon, go]) => {
            const on = id === view || (id === "size" && sheet === "size") || (id === "account" && sheet === "account");
            return (
              <button key={id} type="button" onClick={go} aria-current={on ? "page" : undefined} className={clsx("relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 text-2xs font-semibold focus-visible:outline-offset-[-2px]", on ? "text-ink" : "text-muted")}>
                <Icon className={clsx("h-[22px] w-[22px]", on && id === "saved" && "fill-ink")} aria-hidden />
                <span className="max-w-full truncate px-1">{label}</span>
                {id === "saved" && store.holds.length > 0 && <span className="absolute left-1/2 top-1 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-sale px-1 text-2xs font-bold text-white"><span className="sr-only">: </span>{store.holds.length}</span>}
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
        <FilterSheet sport={sport} value={filters} onChange={(f) => changeFilters(() => f)} sort={sort} onSort={(s) => { setSort(s); setShown(PAGE); }} facets={facets} currency={locale.currency} hasRider={!!fit} fitLabel={fit?.rangeLabel ?? null} count={visible.length} onClose={() => setSheet(null)} />
      )}
      {sheet === "locale" && <LocaleSheet value={locale} onChange={setLocale} onClose={() => setSheet(null)} />}
      {sheet === "account" && (
        <AccountSheet
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setSheet("feedback")} className="btn-ghost flex-1 !justify-start"><MessageCircleQuestion className="h-5 w-5" />Feedback & support</button>
              {acct.user?.isOwner && <button type="button" onClick={() => setSheet("inbox")} className="btn-ghost flex-1 !justify-start"><Inbox className="h-5 w-5" />Feedback inbox</button>}
            </div>
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
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-36 z-[70] flex justify-center px-4 md:bottom-6">
          <div className="pointer-events-auto flex max-w-md items-center gap-1 rounded-card bg-ink py-1 pl-4 pr-1 text-sm font-medium text-white shadow-float">
            <span className="py-2">{toast}</span>
            <button type="button" onClick={() => setToast(null)} className="icon-btn !text-white hover:!bg-white/15 focus-visible:outline-white" aria-label="Dismiss"><X className="h-4 w-4" /></button>
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

function SearchBox({ value, onChange, className }: { value: string; onChange: (q: string) => void; className?: string }) {
  return (
    <label className={clsx("relative items-center", className)}>
      <span className="sr-only">Search boards</span>
      <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted" aria-hidden />
      <input type="search" enterKeyHint="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search brands and models"
        className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-11 text-base outline-none transition placeholder:text-muted focus:border-ink focus:bg-white md:h-10 md:text-sm [&::-webkit-search-cancel-button]:hidden" />
      {value && <button type="button" onClick={() => onChange("")} className="icon-btn absolute right-0 !h-11 !w-11 hover:!bg-transparent md:!h-10" aria-label="Clear search"><X className="h-4 w-4" /></button>}
    </label>
  );
}

/** Empty, error and "coming soon" states: Buddy, a title, one line, one action. */
function Empty({ art, fallbackArt, title, text, action }: { art: string; fallbackArt?: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
      <AssetImg src={art} alt="" className="h-36 w-auto" fallback={fallbackArt ? <AssetImg src={fallbackArt} alt="" className="h-36 w-auto" /> : null} />
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}
