import type { BuyerLocale, LandedCost, Retailer, ShippingRule } from "../types";
import { convert } from "./currency";
import { EU, displaysVatInclusive, importDutyRate, vatRate } from "./vat";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function pickShippingRule(rules: ShippingRule[], dest: string): ShippingRule | null {
  return rules.find((r) => r.destinations.includes(dest)) ?? rules.find((r) => r.destinations.includes("*")) ?? null;
}

/**
 * Total cost to the buyer's door, in the buyer's currency.
 *
 * VAT model:
 *  1. Strip retailer's domestic VAT to get a net price (if their prices include it).
 *  2. Apply the destination's VAT:
 *     – domestic or intra-EU (OSS) → destination VAT charged by retailer
 *     – export outside the retailer's VAT area → buyer pays import VAT + duty on (net + shipping)
 *  3. Display VAT-inclusive for regions that expect it; US/CA show net + tax line.
 */
export function landedCost(price: number, retailer: Retailer, buyer: BuyerLocale): LandedCost | null {
  const notes: string[] = [];
  const rule = pickShippingRule(retailer.shipping, buyer.country);
  if (!rule) return null; // retailer doesn't ship there

  const net = retailer.pricesIncludeVat ? price / (1 + vatRate(retailer.country)) : price;
  const shipNative = rule.freeAbove !== undefined && price >= rule.freeAbove ? 0 : rule.cost;
  if (shipNative === 0) notes.push("Free shipping");

  const netBuyer = convert(net, retailer.currency, buyer.currency);
  const shipBuyer = convert(shipNative, retailer.currency, buyer.currency);
  if (retailer.currency !== buyer.currency) notes.push(`Converted from ${retailer.currency}`);

  const rate = vatRate(buyer.country);
  const domesticOrOss = retailer.country === buyer.country || (EU.has(retailer.country) && EU.has(buyer.country));
  const dutyRate = domesticOrOss ? 0 : importDutyRate(retailer.country, buyer.country);
  const duties = (netBuyer + shipBuyer) * dutyRate;
  const vat = (netBuyer + shipBuyer + duties) * rate;
  if (!domesticOrOss && rate > 0) notes.push("Import VAT collected on delivery");
  if (duties > 0) notes.push(`~${Math.round(dutyRate * 100)}% import duty`);
  if (buyer.country === "US") notes.push("Excl. state sales tax");

  const inclusive = displaysVatInclusive(buyer.country);
  const item = inclusive && domesticOrOss ? netBuyer * (1 + rate) : netBuyer;
  const total = netBuyer + shipBuyer + duties + vat;

  return {
    currency: buyer.currency,
    item: round2(item),
    vat: round2(vat),
    vatRate: rate,
    vatIncluded: inclusive && domesticOrOss,
    shipping: round2(shipBuyer),
    duties: round2(duties),
    total: round2(total),
    notes,
  };
}
