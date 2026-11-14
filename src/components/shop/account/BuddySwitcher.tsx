"use client";
import clsx from "clsx";
import { ChevronDown, Pencil, Plus, Store as StoreIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BROWSE_ID, type Buddy } from "@/lib/profile";
import { Avatar } from "./Avatar";

/** Header chip: who are we shopping for? Switch buddy, browse everything, add or edit. */
export function BuddySwitcher({ buddies, activeId, onSwitch, onAdd, onEdit, summary }: {
  buddies: Buddy[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  summary: (b: Buddy) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = buddies.find((b) => b.id === activeId);
  const browsing = activeId === BROWSE_ID;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className="flex max-w-[11rem] min-w-0 items-center gap-1.5 rounded-full border-2 border-paper/20 py-1 pl-1 pr-2 text-sm font-semibold hover:border-acid">
        {browsing ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper/15"><StoreIcon className="h-4 w-4" /></span> : active && <Avatar n={active.avatar} name={active.name} size={28} />}
        <span className="truncate">{browsing ? "Everything" : active?.name}</span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>
      {open && (
        <div role="menu" className="sticker fixed inset-x-4 top-16 z-50 p-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-paper/50">Shopping for</div>
          {buddies.map((b) => (
            <div key={b.id} className={clsx("flex items-center gap-1 rounded-xl", b.id === activeId && "bg-acid/10")}>
              <button type="button" role="menuitemradio" aria-checked={b.id === activeId} onClick={() => { onSwitch(b.id); setOpen(false); }} className="flex min-w-0 flex-1 items-center gap-2 p-2 text-left">
                <Avatar n={b.avatar} name={b.name} size={32} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{b.name}</span>
                  <span className="block truncate text-[11px] text-paper/60">{summary(b)}</span>
                </span>
              </button>
              <button type="button" onClick={() => { onEdit(b.id); setOpen(false); }} className="rounded-lg p-2 text-paper/60 hover:text-acid" aria-label={`Edit ${b.name}`}><Pencil className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" role="menuitemradio" aria-checked={browsing} onClick={() => { onSwitch(BROWSE_ID); setOpen(false); }} className={clsx("flex w-full items-center gap-2 rounded-xl p-2 text-left", browsing && "bg-acid/10")}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/15"><StoreIcon className="h-4 w-4" /></span>
            <span><span className="block font-semibold">Browse everything</span><span className="block text-[11px] text-paper/60">The whole shop, no size or budget filter</span></span>
          </button>
          <button type="button" role="menuitem" onClick={() => { onAdd(); setOpen(false); }} className="mt-1 flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-paper/20 p-2 font-semibold text-acid hover:border-acid">
            <Plus className="h-5 w-5" />Add a buddy
          </button>
        </div>
      )}
    </div>
  );
}
