"use client";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { ASSETS } from "@/lib/assets";
import type { Wall, WallTone } from "@/lib/walls";
import { RackBoard } from "./RackBoard";

const TONE: Record<WallTone, string> = {
  acid: "text-acid [text-shadow:0_0_14px_rgba(212,255,58,0.65)]",
  pink: "text-pink [text-shadow:0_0_14px_rgba(255,61,139,0.65)]",
  ice: "text-ice [text-shadow:0_0_14px_rgba(51,214,255,0.65)]",
  orange: "text-orange [text-shadow:0_0_14px_rgba(255,106,26,0.6)]",
  paper: "text-paper [text-shadow:0_0_12px_rgba(250,250,247,0.4)]",
};

/** One shop section: neon sign + a horizontally scrolling rack of boards. */
export function ShopWall({ wall, selected, onSelect }: {
  wall: Wall;
  /** id of the open board, if it was opened from this wall */
  selected: string | null;
  onSelect: (groupId: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const selIndex = selected ? wall.groups.findIndex((g) => g.id === selected) : -1;
  const scroll = (d: number) => scroller.current?.scrollBy({ left: d * scroller.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section aria-labelledby={`wall-${wall.id}`} className="relative">
      <div className="app-gutter mx-auto flex max-w-7xl items-end justify-between gap-3">
        <div
          className="relative flex h-[70px] min-w-0 max-w-full items-center bg-contain bg-left bg-no-repeat pl-7 pr-12 sm:h-[86px]"
          style={{ backgroundImage: `url(${ASSETS.signNeon})`, aspectRatio: "1000 / 260" }}
        >
          <h2 id={`wall-${wall.id}`} className={clsx("headline whitespace-nowrap text-2xl sm:text-3xl", TONE[wall.tone])}>
            {wall.title}
          </h2>
        </div>
        <div className="hidden shrink-0 gap-2 md:flex">
          <button type="button" onClick={() => scroll(-1)} className="rounded-full border-2 border-paper/30 p-2 hover:border-paper" aria-label={`Scroll ${wall.title} left`}><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => scroll(1)} className="rounded-full border-2 border-paper/30 p-2 hover:border-paper" aria-label={`Scroll ${wall.title} right`}><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>
      <p className="app-gutter mx-auto -mt-1 max-w-7xl text-sm text-paper/60">
        {wall.subtitle} · <span className="tabular-nums">{wall.groups.length}</span> board{wall.groups.length === 1 ? "" : "s"}
      </p>

      <div className="relative mt-3">
        <div className="pointer-events-none absolute inset-x-0 top-[10px] h-[30px] bg-repeat-x" style={{ backgroundImage: `url(${ASSETS.rackRail})`, backgroundSize: "auto 30px" }} />
        <div
          ref={scroller}
          className="no-scrollbar relative flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 pt-1 sm:gap-7"
          style={{ paddingInline: "max(16px, env(safe-area-inset-left, 0px))", scrollPaddingInline: "16px" }}
        >
          {wall.groups.map((g, i) => (
            <RackBoard
              key={g.id}
              group={g}
              wallId={wall.id}
              tilt={((i * 7) % 5) - 2}
              hidden={i === selIndex}
              offset={selIndex < 0 || i === selIndex ? 0 : i < selIndex ? -1 : 1}
              onSelect={() => onSelect(g.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
