"use client";
import { countryName, SHIP_COUNTRIES } from "@/lib/countries";
import { currencyForCountry } from "@/lib/pricing/vat";
import { CurrencyCode as Currencies, type CurrencyCode } from "@/lib/types";
import { Sheet } from "./Sheet";

export function LocaleSheet({ value, onChange, onClose }: { value: { country: string; currency: CurrencyCode }; onChange: (v: { country: string; currency: CurrencyCode }) => void; onClose: () => void }) {
  return (
    <Sheet title="Delivery & currency" onClose={onClose} side="center" footer={<button type="button" className="btn-primary w-full" onClick={onClose}>Done</button>}>
      <p className="mb-4 text-sm text-muted">Prices include delivery, VAT and import duties for this country.</p>
      <label htmlFor="ship-country" className="label">Ship to</label>
      <select id="ship-country" className="input mt-1" value={value.country} onChange={(e) => onChange({ country: e.target.value, currency: currencyForCountry(e.target.value) })}>
        {!SHIP_COUNTRIES.some((c) => c.code === value.country) && <option value={value.country}>{countryName(value.country)}</option>}
        {SHIP_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
      <label htmlFor="ship-currency" className="label mt-4 block">Currency</label>
      <select id="ship-currency" className="input mt-1" value={value.currency} onChange={(e) => onChange({ ...value, currency: e.target.value as CurrencyCode })}>
        {Currencies.options.map((c) => <option key={c}>{c}</option>)}
      </select>
    </Sheet>
  );
}
