"use client";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CurrencyCode, PricePoint, PriceStats } from "@/lib/types";
import { formatMoney } from "@/lib/pricing/currency";

/** Price history in the retailer's currency with MSRP and all-time-low reference lines. */
export function PriceHistoryChart({ history, msrp, stats, currency, height = 180 }: { history: PricePoint[]; msrp: number; stats: PriceStats | null; currency: CurrencyCode; height?: number }) {
  const fmt = (n: number) => formatMoney(n, currency);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <AreaChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ph" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-glacier)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-glacier)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} minTickGap={28} stroke="currentColor" strokeOpacity={0.4} />
          <YAxis tick={{ fontSize: 10 }} width={52} tickFormatter={fmt} domain={["auto", "auto"]} stroke="currentColor" strokeOpacity={0.4} />
          <Tooltip formatter={(v) => [fmt(Number(v)), "Price"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <ReferenceLine y={msrp} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "MSRP", fontSize: 10, position: "insideTopRight" }} />
          {stats && <ReferenceLine y={stats.allTimeLow} stroke="var(--color-tier-xg)" strokeDasharray="4 4" label={{ value: "Low", fontSize: 10, position: "insideBottomRight" }} />}
          <Area type="stepAfter" dataKey="price" stroke="var(--color-glacier)" strokeWidth={2} fill="url(#ph)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
