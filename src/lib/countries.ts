import { VAT_RATES } from "./pricing/vat";

export const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

/** Countries we have VAT data for, by name. */
export const SHIP_COUNTRIES = Object.keys(VAT_RATES)
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));
