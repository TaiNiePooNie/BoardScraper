import type { CurrencyCode } from "../types";

/**
 * FX: units of currency per 1 EUR. Static fallback snapshot; swap in a live provider
 * (e.g. ECB daily reference XML) via `setRates` from a cron/revalidate job.
 */
let RATES: Record<CurrencyCode, number> = {
  EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.94, CAD: 1.5, AUD: 1.65, NZD: 1.8, SEK: 11.3, NOK: 11.7, DKK: 7.46, PLN: 4.3, JPY: 165,
  SGD: 1.45, AED: 3.97, HKD: 8.45,
};
let ratesAsOf = "static-fallback";

export function setRates(rates: Partial<Record<CurrencyCode, number>>, asOf: string) {
  RATES = { ...RATES, ...rates, EUR: 1 };
  ratesAsOf = asOf;
}
export const getRatesAsOf = () => ratesAsOf;

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount;
  return (amount / RATES[from]) * RATES[to];
}

export function formatMoney(amount: number, currency: CurrencyCode, locale = "en"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 0,
  }).format(amount);
}
