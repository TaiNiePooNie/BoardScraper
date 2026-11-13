import type { BuyerLocale, CurrencyCode } from "./types";
import { CurrencyCode as CurrencyEnum } from "./types";
import { currencyForCountry } from "./pricing/vat";

const GEO_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "cloudfront-viewer-country", "x-country-code"];
const DEFAULT_COUNTRY = "DE";

/**
 * Resolve buyer country/currency from edge geo headers, falling back to
 * Accept-Language region, then a default. Explicit overrides (query/cookie) win.
 */
export function resolveLocale(
  headers: Headers,
  override?: { country?: string | null; currency?: string | null },
): BuyerLocale {
  const overrideCurrency = CurrencyEnum.safeParse(override?.currency).data as CurrencyCode | undefined;

  if (override?.country && /^[A-Za-z]{2}$/.test(override.country)) {
    const country = override.country.toUpperCase();
    return { country, currency: overrideCurrency ?? currencyForCountry(country), source: "override" };
  }
  for (const h of GEO_HEADERS) {
    const v = headers.get(h);
    if (v && /^[A-Z]{2}$/i.test(v) && v.toUpperCase() !== "XX") {
      const country = v.toUpperCase();
      return { country, currency: overrideCurrency ?? currencyForCountry(country), source: "header" };
    }
  }
  const al = headers.get("accept-language");
  const region = al?.match(/[a-z]{2}-([A-Z]{2})/)?.[1];
  if (region) return { country: region, currency: overrideCurrency ?? currencyForCountry(region), source: "accept-language" };

  return { country: DEFAULT_COUNTRY, currency: overrideCurrency ?? currencyForCountry(DEFAULT_COUNTRY), source: "default" };
}
