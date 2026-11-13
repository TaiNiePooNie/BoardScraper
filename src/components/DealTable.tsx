"use client";
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
import { ProductImg } from "./ProductImg";
import { useState } from "react";
import type { Deal } from "@/lib/types";
import { formatMoney } from "@/lib/pricing/currency";
import { TierBadge } from "./TierBadge";

const TIER_ORDER = { "extremely-good": 4, "very-good": 3, good: 2, normal: 1, bad: 0 } as const;
const col = createColumnHelper<Deal>();

const columns = [
  col.accessor((d) => `${d.board.brand} ${d.board.model}`, {
    id: "board", header: "Board",
    cell: (c) => (
      <div className="flex items-center gap-2">
        <ProductImg src={c.row.original.board.images[0]} alt="" className="h-10 w-8 rounded object-contain" />
        <div><div className="font-semibold">{c.row.original.board.model}</div><div className="text-xs text-slate-500">{c.row.original.board.brand}</div></div>
      </div>
    ),
  }),
  col.accessor((d) => TIER_ORDER[d.grade.tier] * 1000 + d.grade.score, { id: "tier", header: "Deal", cell: (c) => <TierBadge tier={c.row.original.grade.tier} score={c.row.original.grade.score} /> }),
  col.accessor((d) => d.grade.discountPct, { id: "drop", header: "Drop", cell: (c) => (Math.round(c.getValue() * 100) > 0 ? <span className="font-semibold text-tier-xg">−{Math.round(c.getValue() * 100)}%</span> : "—") }),
  col.accessor((d) => d.grade.vsAllTimeLowPct, { id: "atl", header: "vs Low", sortUndefined: "last", cell: (c) => { const v = c.getValue(); return v === null ? <span className="text-xs text-slate-400" title="Not enough price history yet">new</span> : v <= 0 ? <b className="text-tier-xg">At low</b> : `+${Math.round(v * 100)}%`; } }),
  col.accessor((d) => d.listing.price.amount, { id: "price", header: "Price", cell: (c) => formatMoney(c.getValue(), c.row.original.listing.price.currency) }),
  col.accessor((d) => d.landed.total, { id: "total", header: "Delivered", cell: (c) => <b>{formatMoney(c.getValue(), c.row.original.landed.currency)}</b> }),
  col.accessor((d) => d.board.flex, { id: "flex", header: "Flex", sortUndefined: "last", cell: (c) => c.getValue() ?? "—" }),
  col.accessor((d) => d.board.profile, { id: "profile", header: "Profile", cell: (c) => <span className="capitalize">{c.getValue()?.replace("-", " ") ?? "—"}</span> }),
  col.accessor((d) => (d.matchingSizes.length ? d.matchingSizes.map((m) => m.size) : d.listing.sizes).toSorted((a, b) => a.lengthCm - b.lengthCm).map((s) => s.label).join(", "), { id: "sizes", header: "Sizes", enableSorting: false }),
  col.accessor((d) => d.board.reviews?.average ?? 0, { id: "rating", header: "Rating", cell: (c) => (c.getValue() ? `★ ${c.getValue().toFixed(1)}` : "—") }),
  col.accessor((d) => d.board.ambassadors.map((a) => a.name).join(", "), { id: "riders", header: "Pro riders", cell: (c) => <span className="text-xs">{c.getValue() || "—"}</span> }),
  col.accessor((d) => Math.round(d.styleFit * 100), { id: "fit", header: "Style fit", cell: (c) => `${c.getValue()}%` }),
  col.display({ id: "link", header: "", cell: (c) => <a href={c.row.original.listing.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 text-xs text-glacier hover:underline">{c.row.original.retailer.name.replace(/ \(mock\)$/, "")}<ExternalLink className="h-3 w-3" /></a> }),
];

export function DealTable({ deals }: { deals: Deal[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "tier", desc: true }]);
  const table = useReactTable({ data: deals, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[1200px] text-sm">
        <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const s = h.column.getIsSorted();
                return (
                  <th key={h.id} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                    {h.column.getCanSort() ? (
                      <button onClick={h.column.getToggleSortingHandler()} className="flex items-center gap-1 hover:text-glacier">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {s === "asc" ? <ArrowUp className="h-3 w-3" /> : s === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
              {r.getVisibleCells().map((c) => <td key={c.id} className={c.column.id === "riders" ? "px-3 py-2" : "whitespace-nowrap px-3 py-2"}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
