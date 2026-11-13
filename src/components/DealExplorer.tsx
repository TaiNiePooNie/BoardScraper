"use client";
import clsx from "clsx";
import { LayoutGrid, Table2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BuyerLocale, CurrencyCode, RiderInput } from "@/lib/types";
import { CurrencyCode as Currencies, DEAL_TIERS } from "@/lib/types";
import type { DealsResult } from "@/lib/deals";
import { applyFilters, countByTier, DEFAULT_FILTERS, facets as getFacets, type DealFilters } from "@/lib/filters";
import { ASSETS } from "@/lib/assets";
import { AssetImg } from "./AssetImg";
import { DealCard } from "./DealCard";
import { DealTable } from "./DealTable";
import { DealTabs, type TabValue } from "./DealTabs";
import { FilterPanel } from "./FilterPanel";
import { RecommendationPanel } from "./RecommendationPanel";
import { RiderForm } from "./RiderForm";

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
  const filtered = useMemo(() => applyFilters(deals, filters), [deals, filters]);
  const counts = useMemo(() => countByTier(filtered), [filtered]);
  const visible = tab === "all" ? filtered : filtered.filter((d) => d.grade.tier === tab);
  const facets = useMemo(() => getFacets(deals), [deals]);
  const rec = result?.recommendation ?? null;

  return (
    <div className="mx-auto -mt-4 flex max-w-7xl flex-col gap-5 px-4 pb-16 sm:px-6">
      <RiderForm onSubmit={setRider} loading={loading} />
      {rec && <RecommendationPanel rec={rec} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DealTabs value={tab} onChange={setTab} counts={counts} />
        <div className="flex items-center gap-2">
          <select className="input w-auto" value={locale.currency} onChange={(e) => setLocale((l) => ({ ...l, currency: e.target.value as CurrencyCode }))} aria-label="Currency">
            {Currencies.options.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="input w-16 uppercase" maxLength={2} value={locale.country} aria-label="Ship-to country"
            onChange={(e) => e.target.value.length === 2 && setLocale((l) => ({ ...l, country: e.target.value.toUpperCase() }))} title="Ship-to country (ISO code)" />
          <div className="flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
            {(["cards", "table"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-label={`${v} view`} className={clsx("rounded-md p-1.5", view === v && "bg-glacier/20 text-glacier")}>
                {v === "cards" ? <LayoutGrid className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {result && (
        <p className="-mt-2 text-xs text-slate-500">
          {result.source === "mock"
            ? "Demo data — set DATABASE_URL to show live prices."
            : `Live prices from ${new Set(deals.map((d) => d.retailer.id)).size} retailers${result.updatedAt ? ` · updated ${new Date(result.updatedAt).toLocaleString()}` : ""}`}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <FilterPanel value={filters} onChange={setFilters} facets={facets} currency={locale.currency} wideLocked={!!rec?.requiresWide} />
        <section aria-live="polite">
          {visible.length === 0 ? (
            <div className="panel flex flex-col items-center gap-3 p-10 text-center">
              <AssetImg src={ASSETS.emptyState} alt="" className="h-40 w-auto" />
              <p className="font-semibold">{loading ? "Loading deals…" : "No deals in this tier."}</p>
              {!loading && <p className="text-sm text-slate-500">Try another tab or loosen your filters.</p>}
            </div>
          ) : view === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((d) => <DealCard key={d.listing.id} deal={d} />)}
            </div>
          ) : (
            <DealTable deals={visible} />
          )}
        </section>
      </div>
    </div>
  );
}
