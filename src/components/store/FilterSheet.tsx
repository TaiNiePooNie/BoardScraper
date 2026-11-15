"use client";
import clsx from "clsx";
import { formatMoney } from "@/lib/pricing/currency";
import { EMPTY_FILTERS, SORT_LABEL, type SortMode, type StoreFilters, type storeFacets } from "@/lib/store";
import { AUDIENCE_CHOICES, choiceMembers, type AudienceChoice } from "@/lib/sizing";
import type { CurrencyCode, Sport } from "@/lib/types";
import { Sheet } from "./Sheet";

function Toggle({ label, hint, on, onChange, disabled }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className="flex w-full items-center gap-3 py-2 text-left disabled:opacity-40">
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
      <span className={clsx("relative h-7 w-12 shrink-0 rounded-full transition", on ? "bg-ink" : "bg-line")}>
        <span className={clsx("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-4 first:border-t-0 first:pt-1">
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      {children}
    </section>
  );
}

export const AUDIENCE_LABEL: Record<AudienceChoice, string> = { kids: "Kids", mens: "Men", womens: "Women", adults: "Adults" };

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
  const price = value.maxPrice ?? max;

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
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Sort by">
          {(Object.keys(SORT_LABEL) as SortMode[]).map((s) => <button key={s} type="button" role="radio" aria-checked={sort === s} onClick={() => onSort(s)} className="chip">{SORT_LABEL[s]}</button>)}
        </div>
      </Group>
      <Group title="Fit">
        <Toggle label="Fits me" hint={hasRider ? `Only boards in your size${fitLabel ? ` (${fitLabel})` : ""}` : "Set your size first"} on={value.fitsMe} disabled={!hasRider} onChange={(v) => set({ fitsMe: v })} />
        <Toggle label="On sale" hint="At least 10% off the original price" on={value.saleOnly} onChange={(v) => set({ saleOnly: v })} />
        <p className="mt-2 text-xs text-muted">Who it&apos;s for (pick one or more)</p>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Who it's for">
          {AUDIENCE_CHOICES[sport].map((c) => {
            const members = choiceMembers(c);
            const on = members.every((m) => value.audience.includes(m));
            const next = on ? value.audience.filter((a) => !members.includes(a)) : [...new Set([...value.audience, ...members])];
            return <button key={c} type="button" aria-pressed={on} onClick={() => set({ audience: next })} className="chip">{AUDIENCE_LABEL[c]}</button>;
          })}
        </div>
      </Group>
      <Group title="Max price">
        <div className="flex items-center justify-between text-sm"><span className="text-muted">Up to</span><span className="font-bold tabular-nums">{value.maxPrice === null ? "Any price" : formatMoney(price, currency)}</span></div>
        <input type="range" className="bb-range" min={50} max={max} step={10} value={price} aria-label="Max price"
          style={{ ["--fill" as string]: `${((price - 50) / (max - 50)) * 100}%` }}
          onChange={(e) => { const n = Number(e.target.value); set({ maxPrice: n >= max ? null : n }); }} />
      </Group>
      {facets.brands.length > 1 && (
        <Group title="Brand">
          <div className="flex flex-wrap gap-1.5">
            {facets.brands.map(([b, n]) => <button key={b} type="button" aria-pressed={value.brands.includes(b)} onClick={() => set({ brands: toggleIn(value.brands, b) })} className="chip">{b} <span className="opacity-60">{n}</span></button>)}
          </div>
        </Group>
      )}
      {facets.shops.length > 0 && (
        <Group title="Websites">
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>{value.shops.length ? `${value.shops.length} of ${facets.shops.length} selected` : `All ${facets.shops.length} shops`}</span>
            {value.shops.length > 0 && <button type="button" className="font-semibold text-ink underline underline-offset-2" onClick={() => set({ shops: [] })}>Show all</button>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {facets.shops.map((s) => (
              <button key={s.id} type="button" aria-pressed={value.shops.includes(s.id)} onClick={() => set({ shops: toggleIn(value.shops, s.id) })} className="chip">
                {s.name} <span className="opacity-60">{s.n}</span>
              </button>
            ))}
          </div>
        </Group>
      )}
    </Sheet>
  );
}
