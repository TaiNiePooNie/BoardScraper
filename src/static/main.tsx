/**
 * Static build entry: the same shop, with deals computed in the browser from an
 * embedded catalog snapshot (no server/API). Used for the artifact / static hosting.
 */
import { createRoot } from "react-dom/client";
import { ShopApp } from "@/components/shop/ShopApp";
import type { ShopServices } from "@/components/shop/services";
import { buildDeals } from "@/lib/deals";
import { currencyForCountry } from "@/lib/pricing/vat";
import { countryFromTimezone } from "@/lib/tzCountry";
import type { BuyerLocale } from "@/lib/types";
import type { Catalog } from "@/lib/data/repository";

interface Snapshot extends Catalog {
  exportedAt: string;
}

const snapshot: Snapshot = JSON.parse(document.getElementById("catalog")!.textContent!);

/** No IP geolocation in a static page: device timezone first (tracks physical location), then language region. */
function browserLocale(): BuyerLocale {
  const tzCountry = countryFromTimezone();
  if (tzCountry) return { country: tzCountry, currency: currencyForCountry(tzCountry), source: "timezone" };
  for (const tag of navigator.languages ?? [navigator.language]) {
    const region = tag.match(/-([A-Z]{2})\b/i)?.[1]?.toUpperCase();
    if (region) return { country: region, currency: currencyForCountry(region), source: "accept-language" };
  }
  return { country: "DE", currency: "EUR", source: "default" };
}

const services: ShopServices = {
  loadDeals: async ({ country, currency, rider }) => ({
    ...buildDeals(snapshot, { country, currency, source: "override" }, rider),
    source: "db",
    updatedAt: snapshot.exportedAt,
  }),
};

document.documentElement.classList.add("dark");
createRoot(document.getElementById("root")!).render(<ShopApp initialLocale={browserLocale()} services={services} />);
