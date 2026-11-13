/**
 * Static build entry: the same UI, with deals computed in the browser from an
 * embedded catalog snapshot (no server/API). Used for the artifact / static hosting.
 */
import { createRoot } from "react-dom/client";
import { DealExplorer, type DealsLoader } from "@/components/DealExplorer";
import { buildDeals } from "@/lib/deals";
import { currencyForCountry } from "@/lib/pricing/vat";
import type { BuyerLocale } from "@/lib/types";
import type { Catalog } from "@/lib/data/repository";

interface Snapshot extends Catalog {
  exportedAt: string;
}

const snapshot: Snapshot = JSON.parse(document.getElementById("catalog")!.textContent!);

function browserLocale(): BuyerLocale {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const region = tag.match(/-([A-Z]{2})\b/i)?.[1]?.toUpperCase();
    if (region) return { country: region, currency: currencyForCountry(region), source: "accept-language" };
  }
  return { country: "DE", currency: "EUR", source: "default" };
}

const loadDeals: DealsLoader = async ({ country, currency, rider }) => ({
  ...buildDeals(snapshot, { country, currency, source: "override" }, rider),
  source: "db",
  updatedAt: snapshot.exportedAt,
});

function App() {
  return (
    <main>
      <header className="app-gutter mx-auto max-w-7xl pb-8 pt-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-glacier">BoardScraper · test build</div>
        <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl" style={{ textWrap: "balance" }}>
          Snowboard deals, sized for <span className="text-glacier">you</span>.
        </h1>
        <p className="mt-3 max-w-xl text-slate-600 dark:text-slate-300">
          Enter your weight, height and boot size. We pick your ideal length, waist and flex, then grade every live deal against MSRP and its price history.
        </p>
      </header>
      <DealExplorer initialLocale={browserLocale()} loadDeals={loadDeals} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
