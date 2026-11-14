"use client";
import clsx from "clsx";
import { LayoutGrid, Table2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BuyerLocale, CurrencyCode, RiderInput } from "@/lib/types";
import { CurrencyCode as Currencies, DEAL_TIERS } from "@/lib/types";
import type { DealsResult } from "@/lib/deals";
import { applyFilters, countByTier, DEFAULT_FILTERS, facets as getFacets, type DealFilters } from "@/lib/filters";
import { currencyForCountry, VAT_RATES } from "@/lib/pricing/vat";
import { countGroupsByTier, groupDeals, SLIGHTLY_OVER, sortGroups, type BoardGroup, type Budget, type SortMode } from "@/lib/offers";
import { ASSETS } from "@/lib/assets";
import { AssetImg } from "./AssetImg";
import { DealCard } from "./DealCard";
import { DealTable } from "./DealTable";
import { DealTabs, type TabValue } from "./DealTabs";
import { FilterPanel } from "./FilterPanel";
import { RecommendationPanel } from "./RecommendationPanel";
import { RiderForm } from "./RiderForm";

const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};
/** Countries we have VAT data for, by name. Changing country also switches to its currency. */
const SHIP_COUNTRIES = Object.keys(VAT_RATES).map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name));

export type DealsLoader = (q: { country: string; currency: CurrencyCode; rider: RiderInput | null }) => Promise<DealsResult>;

const apiLoader: DealsLoader = async ({ country, currency, rider }) => {
  const q = new URLSearchParams({ country, currency });
  if (rider) Object.entries(rider).forEach(([k, v]) => q.set(k, String(v)));
  const res = await fetch(`/api/deals?${q}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** `loadDeals` defaults to the API; the static build computes deals in the browser instead. */
export function DealExplorer({ initialLocale, loadDeals = apiLoader }: { initialLocale: BuyerLocale; loadDeals?: DealsLoader }) {
  const [rider, setRider] = useState<RiderInput | null>(null);
  const [locale, setLocale] = useState({ country: initialLocale.country, currency: initialLocale.currency });
  const [result, setResult] = useState<DealsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabValue>("extremely-good");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [filters, setFilters] = useState<DealFilters>(DEFAULT_FILTERS);
  const [budget, setBudget] = useState<Budget>({ min: null, max: null });
  const [budgetMode, setBudgetMode] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("value");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await loadDeals({ ...locale, rider });
      setResult(r);
      // Open on the best tier that has deals.
      const counts = countByTier(r.deals);
      setTab(DEAL_TIERS.find((t) => counts[t] > 0) ?? "all");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [rider, locale, loadDeals]);

  useEffect(() => { load(); }, [load]);

  const deals = result?.deals ?? [];
  const rec = result?.recommendation ?? null;
  const filtered = useMemo(() => applyFilters(deals, filters), [deals, filters]);
  const groups = useMemo(() => groupDeals(filtered, budget, rider?.style ?? null), [filtered, budget, rider]);
  // Budget acts as a filter in both views; "slightly over" only gets its own section in budget view.
  const inBudget = useMemo(() => groups.filter((g) => g.budget === "in" || g.budget === "none"), [groups]);
  const slightlyOver = useMemo(() => sortGroups(groups.filter((g) => g.budget === "over"), sortMode), [groups, sortMode]);
  const counts = useMemo(() => countGroupsByTier(inBudget), [inBudget]);
  const visible = budgetMode
    ? sortGroups(inBudget, sortMode)
    : (tab === "all" ? inBudget : inBudget.filter((g) => g.tier === tab)).toSorted((a, b) => b.best.grade.score - a.best.grade.score);
  const facets = useMemo(() => getFacets(deals), [deals]);
  const hasBudget = budget.min !== null || budget.max !== null;
  const shopCount = new Set(deals.map((d) => d.retailer.id)).size;

  const renderGroups = (list: BoardGroup[], ranked: boolean) =>
    view === "cards" ? (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((g, i) => <DealCard key={g.id} group={g} budget={budget} rank={ranked ? i + 1 : undefined} />)}
      </div>
    ) : (
      <DealTable groups={list} initialSort={budgetMode ? "match" : "tier"} />
    );

  return (
    <div className="app-gutter mx-auto -mt-4 flex max-w-7xl flex-col gap-5 pb-16">
      <RiderForm onSubmit={(r, b) => { setRider(r); setBudget(b); }} loading={loading} currency={locale.currency} />
      {rec && <RecommendationPanel rec={rec} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="View" className="flex rounded-xl border border-slate-300 p-0.5 text-sm font-semibold dark:border-slate-700">
          {([[true, "Budget view"], [false, "Deal tiers"]] as const).map(([on, label]) => (
            <button key={label} role="radio" aria-checked={budgetMode === on} onClick={() => setBudgetMode(on)}
              className={clsx("rounded-lg px-3 py-1.5 transition", budgetMode === on ? "bg-ink text-white dark:bg-white dark:text-ink" : "text-slate-500 hover:text-glacier")}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {budgetMode && view === "cards" && (
            <select id="sort-mode" className="input w-auto" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} aria-label="Sort">
              <option value="value">Best for you</option>
              <option value="price">Lowest price</option>
              <option value="discount">Biggest discount</option>
            </select>
          )}
          <label htmlFor="country" className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            Ship to
            <select id="country" className="input w-auto" value={locale.country}
              onChange={(e) => setLocale({ country: e.target.value, currency: currencyForCountry(e.target.value) })}>
              {SHIP_COUNTRIES.some((c) => c.code === locale.country) ? null : <option value={locale.country}>{countryName(locale.country)}</option>}
              {SHIP_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </label>
          <label htmlFor="currency" className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            Currency
            <select id="currency" className="input w-auto" value={locale.currency} onChange={(e) => setLocale((l) => ({ ...l, currency: e.target.value as CurrencyCode }))}>
              {Currencies.options.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <div className="flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
            {(["cards", "table"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-label={`${v} view`} className={clsx("rounded-md p-1.5", view === v && "bg-glacier/20 text-glacier")}>
                {v === "cards" ? <LayoutGrid className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!budgetMode && <DealTabs value={tab} onChange={setTab} counts={counts} />}

      {result && (
        <p className="-mt-2 text-xs text-slate-500">
          {budgetMode && (
            <b>
              {inBudget.length} board{inBudget.length === 1 ? "" : "s"} {rider ? "fit you" : "listed"}{hasBudget ? " within budget" : ""}
              {slightlyOver.length > 0 && ` · ${slightlyOver.length} slightly over`} ·{" "}
            </b>
          )}
          {result.source === "mock"
            ? "Demo data — set DATABASE_URL to show live prices."
            : `Live prices from ${shopCount} shop${shopCount === 1 ? "" : "s"} that ship to ${countryName(locale.country)}${result.updatedAt ? ` · updated ${new Date(result.updatedAt).toLocaleString()}` : ""}`}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <FilterPanel value={filters} onChange={setFilters} facets={facets} currency={locale.currency} wideLocked={!!rec?.requiresWide} />
        <section aria-live="polite" className="flex min-w-0 flex-col gap-6">
          {visible.length === 0 ? (
            <div className="panel flex flex-col items-center gap-3 p-10 text-center">
              <AssetImg src={ASSETS.emptyState} alt="" className="h-40 w-auto" />
              <p className="font-semibold">{loading ? "Loading deals…" : budgetMode ? "No boards fit your size and budget." : "No deals in this tier."}</p>
              {!loading && <p className="text-sm text-slate-500">{budgetMode ? "Raise your budget or loosen the filters." : "Try another tab or loosen your filters."}</p>}
            </div>
          ) : (
            renderGroups(visible, budgetMode && sortMode === "value")
          )}
          {budgetMode && slightlyOver.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Slightly over budget <span className="font-medium normal-case text-slate-500">(up to {Math.round(SLIGHTLY_OVER * 100)}% above your max)</span>
              </h2>
              {renderGroups(slightlyOver, false)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
