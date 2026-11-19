"use client";
import clsx from "clsx";
import { BOARD_COLORS, COLOR_HEX, COLOR_LABEL } from "@/lib/colors";
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
      title="Filter"
      label="Filter and sort"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={() => onChange({ ...EMPTY_FILTERS, q: value.q, category: value.category })}>Clear</button>
          <button type="button" className="btn-primary flex-[2]" onClick={onClose}>Show {count} board{count === 1 ? "" : "s"}</button>
        </div>
      }
    >
      <Group title="Sort by">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Sort by">
          {(Object.keys(SORT_LABEL) as SortMode[]).map((s) => <button key={s} type="button" role="radio" aria-checked={sort === s} onClick={() => onSort(s)} className="chip">{SORT_LABEL[s]}</button>)}
        </div>
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
      <Group title="Max price, delivered" action={<span className="num text-2xl leading-none">{value.maxPrice === null ? "Any" : formatMoney(price, currency)}</span>}>
        <input type="range" className="bb-range" min={50} max={max} step={10} value={price} aria-label="Max price"
          aria-valuetext={value.maxPrice === null ? "Any price" : formatMoney(price, currency)}
          style={{ ["--fill" as string]: `${((price - 50) / Math.max(1, max - 50)) * 100}%` }}
          onChange={(e) => { const n = Number(e.target.value); set({ maxPrice: n >= max ? null : n }); }} />
      </Group>
      {facets.colors.size > 0 && (
        <Group title="Colour" action={value.colors.length > 0 ? <button type="button" className="link text-xs" onClick={() => set({ colors: [] })}>Show all</button> : undefined}>
          <div className="grid grid-cols-5 gap-x-1 gap-y-3 sm:grid-cols-6">
            {BOARD_COLORS.filter((c) => facets.colors.has(c)).map((c) => {
              const on = value.colors.includes(c);
              return (
                <button key={c} type="button" aria-pressed={on} title={`${COLOR_LABEL[c]} (${facets.colors.get(c)})`} onClick={() => set({ colors: toggleIn(value.colors, c) })}
                  className="flex min-w-0 flex-col items-center gap-1.5 rounded-control py-1 text-[0.625rem] font-bold uppercase tracking-[0.1em]">
                  <span className={clsx("h-9 w-9 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)]", on && "ring-2 ring-ink ring-offset-2 ring-offset-cream")} style={{ background: COLOR_HEX[c] }} />
                  <span className="max-w-full truncate">{c === "brown" ? "Wood" : COLOR_LABEL[c]}</span>
                  <span className="sr-only">, {facets.colors.get(c)} boards</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Read from the main product photo, so multi-coloured graphics show under each of their main colours.</p>
        </Group>
      )}
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
