import type { CountryCode, CurrencyCode } from "../types";

/** Standard VAT/GST rates (2026). US = 0: sales tax is state-level and shown at checkout. */
export const VAT_RATES: Record<string, number> = {
  AT: 0.2, BE: 0.21, BG: 0.2, HR: 0.25, CY: 0.19, CZ: 0.21, DK: 0.25, EE: 0.24, FI: 0.255, FR: 0.2,
  DE: 0.19, GR: 0.24, HU: 0.27, IE: 0.23, IT: 0.22, LV: 0.21, LT: 0.21, LU: 0.17, MT: 0.18, NL: 0.21,
  PL: 0.23, PT: 0.23, RO: 0.21, SK: 0.23, SI: 0.22, ES: 0.21, SE: 0.25,
  GB: 0.2, CH: 0.081, NO: 0.25, IS: 0.24,
  US: 0, CA: 0.05, AU: 0.1, NZ: 0.15, JP: 0.1, SG: 0.09, AE: 0.05,
};

export const EU = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"]);

/** Regions where consumer prices are conventionally shown VAT-inclusive. */
export const displaysVatInclusive = (country: CountryCode) => country !== "US" && country !== "CA";

export const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  US: "USD", GB: "GBP", CH: "CHF", CA: "CAD", AU: "AUD", NZ: "NZD", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", JP: "JPY",
  SG: "SGD", AE: "AED",
};
export const currencyForCountry = (c: CountryCode): CurrencyCode => COUNTRY_CURRENCY[c] ?? "EUR";

export const vatRate = (c: CountryCode) => VAT_RATES[c] ?? 0;

/**
 * Import duty estimate on snowboards (ex-EU into EU ≈ 4 % HS 9506.11; into CH/NO ≈ 0; into US ≈ 0 under de-minimis rules vary).
 * Placeholder — replace with a proper tariff lookup if accuracy matters.
 */
export function importDutyRate(from: CountryCode, to: CountryCode): number {
  if (from === to) return 0;
  if (EU.has(from) && EU.has(to)) return 0;
  if (EU.has(to)) return 0.04;
  if (to === "GB") return 0.04;
  if (to === "CA") return 0.065;
  return 0;
}
