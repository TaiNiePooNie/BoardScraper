"use client";
import { formatMoney } from "@/lib/pricing/currency";
import { DISCOUNT_STEPS, EMPTY_FILTERS, MIN_DISCOUNT, SORT_LABEL, type SortMode, type StoreFilters, type storeFacets } from "@/lib/store";
import { AUDIENCE_CHOICES, choiceMembers, type AudienceChoice } from "@/lib/sizing";
import type { CurrencyCode, Sport } from "@/lib/types";
import { Group, Sheet, Toggle } from "./Sheet";

export const AUDIENCE_LABEL: Record<AudienceChoice, string> = { kids: "Kids", mens: "Men", womens: "Women", adults: "Adults" };

export const discountLabel = (min: number) => (min <= 0 ? "Any" : min <= MIN_DISCOUNT ? "On sale" : `−${Math.round(min * 100)}% or more`);

export function FilterSheet({ value, onChange, sort, onSort, facets, currency, hasRider, fitLabel, count, onClose, sport }: {
  sport: Sport;
  value: StoreFilters;
  onChange: (f: StoreFilters) => void;
  sort: SortMode;
  onSort: (s: SortMode) => void;
  facets: ReturnType<typeof storeFacets>;
  currency: CurrencyCode;
  hasRider: boolean;
  fitLabel: string | null;
  count: number;
  onClose: () => void;
}) {
  const set = (p: Partial<StoreFilters>) => onChange({ ...value, ...p });
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const max = facets.maxTotal || 1000;
  const price = Math.min(value.maxPrice ?? max, max);

  return (
    <Sheet
      title="Filter & sort"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={() => onChange({ ...EMPTY_FILTERS, q: value.q, category: value.category })}>Clear</button>
          <button type="button" className="btn-primary flex-[2]" onClick={onClose}>Show {count} board{count === 1 ? "" : "s"}</button>
        </div>
      }
    >
      <Group title="Sort by">
        <select className="input" aria-label="Sort by" value={sort} onChange={(e) => onSort(e.target.value as SortMode)}>
          {(Object.keys(SORT_LABEL) as SortMode[]).map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
        </select>
      </Group>
      <Group title="Deals">
        <p className="mb-1.5 text-xs text-muted">Discount off the original price</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Discount">
          {[0, ...DISCOUNT_STEPS].map((d) => <button key={d} type="button" role="radio" aria-checked={value.minDiscount === d} onClick={() => set({ minDiscount: d })} className="chip">{discountLabel(d)}</button>)}
        </div>
        <div className="mt-2">
          <Toggle label="Price dropped" hint="Got cheaper in the last 14 days" on={value.priceDrop} onChange={(v) => set({ priceDrop: v })} />
          <Toggle label="Lowest in 90 days" hint="At its best price in three months" on={value.lowest} onChange={(v) => set({ lowest: v })} />
          <Toggle label="Last sizes" hint="Selling out: few sizes or shops left" on={value.lastSizes} onChange={(v) => set({ lastSizes: v })} />
        </div>
      </Group>
      <Group title="Fit">
        <Toggle label="Fits me" hint={hasRider ? `Only boards in your size${fitLabel ? ` (${fitLabel})` : ""}` : "Set your size first (Find my size)"} on={value.fitsMe} disabled={!hasRider} onChange={(v) => set({ fitsMe: v })} />
        <p className="mb-1.5 mt-2 text-xs text-muted">Who it&apos;s for (pick one or more)</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Who it's for">
          {AUDIENCE_CHOICES[sport].map((c) => {
            const members = choiceMembers(c);
            const on = members.every((m) => value.audience.includes(m));
            const next = on ? value.audience.filter((a) => !members.includes(a)) : [...new Set([...value.audience, ...members])];
            return <button key={c} type="button" aria-pressed={on} onClick={() => set({ audience: next })} className="chip">{AUDIENCE_LABEL[c]}</button>;
          })}
        </div>
      </Group>
      <Group title="Max price" action={<span className="text-sm font-bold tabular-nums">{value.maxPrice === null ? "Any price" : `Up to ${formatMoney(price, currency)}`}</span>}>
        <input type="range" className="bb-range" min={50} max={max} step={10} value={price} aria-label="Max price"
          aria-valuetext={value.maxPrice === null ? "Any price" : formatMoney(price, currency)}
          style={{ ["--fill" as string]: `${((price - 50) / Math.max(1, max - 50)) * 100}%` }}
          onChange={(e) => { const n = Number(e.target.value); set({ maxPrice: n >= max ? null : n }); }} />
      </Group>
      {facets.brands.length > 1 && (
        <Group title="Brand" action={value.brands.length > 0 ? <button type="button" className="link text-xs" onClick={() => set({ brands: [] })}>Show all</button> : undefined}>
          <div className="flex flex-wrap gap-1.5">
            {facets.brands.map(([b, n]) => <button key={b} type="button" aria-pressed={value.brands.includes(b)} onClick={() => set({ brands: toggleIn(value.brands, b) })} className="chip">{b} <span className="opacity-70">{n}</span></button>)}
          </div>
        </Group>
      )}
      {facets.shops.length > 0 && (
        <Group
          title="Websites"
          hint={value.shops.length ? `${value.shops.length} of ${facets.shops.length} selected` : `All ${facets.shops.length} shops`}
          action={value.shops.length > 0 ? <button type="button" className="link text-xs" onClick={() => set({ shops: [] })}>Show all</button> : undefined}
        >
          <div className="flex flex-wrap gap-1.5">
            {facets.shops.map((s) => (
              <button key={s.id} type="button" aria-pressed={value.shops.includes(s.id)} onClick={() => set({ shops: toggleIn(value.shops, s.id) })} className="chip">
                {s.name} <span className="opacity-70">{s.n}</span>
              </button>
            ))}
          </div>
        </Group>
      )}
    </Sheet>
  );
}
