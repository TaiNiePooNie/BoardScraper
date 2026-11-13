"use client";
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
import { useState } from "react";
import { formatMoney } from "@/lib/pricing/currency";
import { isFullPrice } from "@/lib/grading";
import type { BoardGroup } from "@/lib/offers";
import { ProductImg } from "./ProductImg";
import { TierBadge } from "./TierBadge";

const TIER_ORDER = { "extremely-good": 4, "very-good": 3, good: 2, normal: 1, bad: 0 } as const;
const col = createColumnHelper<BoardGroup>();
const cleanName = (n: string) => n.replace(/ \(mock\)$/, "");

const columns = [
  col.accessor((g) => `${g.board.brand} ${g.board.model}`, {
    id: "board", header: "Board",
    cell: (c) => (
      <div className="flex items-center gap-2">
        <ProductImg src={c.row.original.board.images[0]} alt="" className="h-10 w-8 rounded object-contain" />
        <div>
          <div className="font-semibold">{c.row.original.board.model}</div>
          <div className="text-xs text-slate-500">{c.row.original.board.brand} · {c.row.original.board.season}</div>
        </div>
      </div>
    ),
  }),
  col.accessor((g) => g.value.score, { id: "match", header: "Match", cell: (c) => <span className="font-semibold tabular-nums" title={c.row.original.value.reasons.join(" · ")}>{c.getValue()}</span> }),
  col.accessor((g) => TIER_ORDER[g.tier] * 1000 + g.best.grade.score, {
    id: "tier", header: "Deal",
    cell: (c) => <TierBadge tier={c.row.original.tier} score={c.row.original.best.grade.score} fullPrice={isFullPrice(c.row.original.best.grade)} />,
  }),
  col.accessor((g) => g.best.grade.discountPct, { id: "drop", header: "Drop", cell: (c) => (Math.round(c.getValue() * 100) > 0 ? <span className="font-semibold text-tier-xg">−{Math.round(c.getValue() * 100)}%</span> : "—") }),
  col.accessor((g) => g.best.grade.vsAllTimeLowPct, {
    id: "atl", header: "vs Low", sortUndefined: "last",
    cell: (c) => { const v = c.getValue(); return v === null ? <span className="text-xs text-slate-400" title="Not enough price history yet">new</span> : v <= 0 ? <b className="text-tier-xg">At low</b> : `+${Math.round(v * 100)}%`; },
  }),
  col.accessor((g) => g.best.landed.total, {
    id: "total", header: "Delivered",
    cell: (c) => (
      <span className="tabular-nums">
        <b>{formatMoney(c.getValue(), c.row.original.best.landed.currency)}</b>
        {c.row.original.budget === "over" && <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">over</span>}
      </span>
    ),
  }),
  col.accessor((g) => g.offers.length, { id: "shops", header: "Shops", cell: (c) => <span className="tabular-nums">{c.getValue()}</span> }),
  col.accessor((g) => g.board.flex, { id: "flex", header: "Flex", sortUndefined: "last", cell: (c) => c.getValue() ?? "—" }),
  col.accessor((g) => g.board.profile, { id: "profile", header: "Profile", cell: (c) => <span className="capitalize">{c.getValue()?.replace("-", " ") ?? "—"}</span> }),
  col.accessor((g) => (g.best.matchingSizes.length ? g.best.matchingSizes.map((m) => m.size) : g.best.listing.sizes).toSorted((a, b) => a.lengthCm - b.lengthCm).map((s) => s.label).join(", "), { id: "sizes", header: "Sizes", enableSorting: false }),
  col.accessor((g) => g.board.reviews?.average ?? 0, { id: "rating", header: "Rating", cell: (c) => (c.getValue() ? `★ ${c.getValue().toFixed(1)}` : "—") }),
  col.accessor((g) => g.board.ambassadors.map((a) => a.name).join(", "), { id: "riders", header: "Pro riders", cell: (c) => <span className="text-xs">{c.getValue() || "—"}</span> }),
  col.display({
    id: "link", header: "",
    cell: (c) => (
      <a href={c.row.original.best.listing.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 text-xs text-glacier hover:underline">
        {cleanName(c.row.original.best.retailer.name)}<ExternalLink className="h-3 w-3" />
      </a>
    ),
  }),
];

export function DealTable({ groups, initialSort = "match" }: { groups: BoardGroup[]; initialSort?: "match" | "tier" }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: initialSort, desc: true }]);
  const table = useReactTable({ data: groups, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });

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
