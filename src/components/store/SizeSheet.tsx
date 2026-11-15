"use client";
import clsx from "clsx";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { AssetImg } from "@/components/AssetImg";
import { Avatar } from "@/components/shop/account/Avatar";
import { SizePreview } from "@/components/shop/setup/SizePreview";
import { SliderField } from "@/components/shop/setup/SliderField";
import { ASSETS } from "@/lib/assets";
import type { Buddy } from "@/lib/profile";
import { recommendFor } from "@/lib/sizing";
import { SPORT_SHORT } from "@/lib/store";
import { SPORTS, type FitPreference, type RiderInput, type RiderStyle, type SkateStyle, type SkillLevel, type Sport, type SurfWaves } from "@/lib/types";
import { Sheet } from "./Sheet";
import { SizeRange } from "./SizeRange";
import { SportIcon } from "./SportIcon";

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className="chip">{l}</button>
        ))}
      </div>
    </div>
  );
}

function ShoeSize({ rider, onChange, label }: { rider: RiderInput; onChange: (r: Partial<RiderInput>) => void; label: string }) {
  const sys = rider.bootSystem;
  const [min, max] = sys === "US" ? [1, 16] : [30, 50];
  const step = (d: number) => onChange({ bootSize: Math.min(max, Math.max(min, rider.bootSize + d)) });
  const switchSys = (s: "US" | "EU") => {
    if (s === sys) return;
    onChange({ bootSystem: s, bootSize: s === "EU" ? Math.round((rider.bootSize + 33.5) * 2) / 2 : Math.round((rider.bootSize - 33.5) * 2) / 2 });
  };
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-full border border-line">
          <button type="button" onClick={() => step(-0.5)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface" aria-label="Smaller"><Minus className="h-4 w-4" /></button>
          <span className="min-w-[3.5rem] text-center text-xl font-bold tabular-nums" aria-live="polite">{Number.isInteger(rider.bootSize) ? rider.bootSize : rider.bootSize.toFixed(1)}</span>
          <button type="button" onClick={() => step(0.5)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface" aria-label="Bigger"><Plus className="h-4 w-4" /></button>
        </div>
        <div role="radiogroup" aria-label="Size system" className="flex gap-1">
          {(["US", "EU"] as const).map((s) => <button key={s} type="button" role="radio" aria-checked={sys === s} onClick={() => switchSys(s)} className="chip">{s}</button>)}
        </div>
      </div>
    </div>
  );
}

export function SizeSheet({ sport: initialSport, buddy, buddies, onSave, onSwitchBuddy, onAddBuddy, onClose }: {
  sport: Sport;
  buddy: Buddy;
  buddies: Buddy[];
  onSave: (rider: RiderInput, name: string, sport: Sport) => void;
  onSwitchBuddy: (id: string) => void;
  onAddBuddy: () => void;
  onClose: () => void;
}) {
  const [sport, setSport] = useState<Sport>(initialSport);
  const [r, setR] = useState<RiderInput>(buddy.rider);
  const [name, setName] = useState(buddy.name);
  const set = (p: Partial<RiderInput>) => setR((x) => ({ ...x, ...p }));
  const fit = recommendFor(sport, r);
  const value = sport === "skate" ? fit.ideal : sport === "surf" ? (fit.lengthRangeCm![0] + fit.lengthRangeCm![1]) / 2 / r.heightCm : fit.ideal / r.heightCm;
  const kidsOk = r.fit === "kids";

  const body = (
    <div className="flex flex-col gap-4">
      {/* who */}
      <div className="flex items-center gap-2">
        <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-0.5">
          {buddies.map((b) => (
            <button key={b.id} type="button" onClick={() => onSwitchBuddy(b.id)} aria-pressed={b.id === buddy.id}
              className={clsx("flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold", b.id === buddy.id ? "border-ink" : "border-line text-muted")}>
              <Avatar n={b.avatar} name={b.name} size={26} />{b.name}
            </button>
          ))}
          <button type="button" onClick={onAddBuddy} className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-sm font-semibold text-muted hover:border-ink hover:text-ink"><Plus className="h-4 w-4" />Buddy</button>
        </div>
      </div>
      <label className="sr-only" htmlFor="rider-name">Name</label>
      {buddy.id !== buddies[0]?.id && <input id="rider-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Name" />}

      {/* sport */}
      <div role="radiogroup" aria-label="Sport" className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1">
        {SPORTS.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={sport === s} onClick={() => setSport(s)}
            className={clsx("flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition", sport === s ? "bg-white shadow-sm" : "text-muted")}>
            <SportIcon sport={s} className="h-5 w-5" />{SPORT_SHORT[s]}
          </button>
        ))}
      </div>

      {/* fit */}
      <div role="radiogroup" aria-label="Who's it for" className="grid grid-cols-4 gap-1.5">
        {(["kids", "mens", "womens", "any"] as FitPreference[]).map((f) => (
          <button key={f} type="button" role="radio" aria-checked={(r.fit ?? "any") === f} onClick={() => set({ fit: f })}
            className={clsx("flex flex-col items-center gap-0.5 rounded-2xl border px-1 py-1.5 text-xs font-semibold", (r.fit ?? "any") === f ? "border-ink bg-surface" : "border-line text-muted")}>
            <AssetImg src={ASSETS.fit[f]} alt="" className="h-7 w-7" />
            {{ kids: "Kids", mens: "Men", womens: "Women", any: "All" }[f]}
          </button>
        ))}
      </div>

      {/* body + preview */}
      {sport !== "skate" ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(104px,40%)] gap-3">
          <div className="flex flex-col justify-center gap-2">
            <SliderField id="height" label="Height" unit="cm" min={90} max={210} value={r.heightCm} onChange={(v) => set({ heightCm: v })} />
            <SliderField id="weight" label="Weight" unit="kg" min={15} max={140} step={0.5} value={r.weightKg} onChange={(v) => set({ weightKg: v })} />
          </div>
          <div className="h-[clamp(150px,26dvh,240px)]">
            <SizePreview sport={sport} heightCm={r.heightCm} weightKg={r.weightKg} value={value} badge={fit.label} fit={r.fit ?? "any"} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(104px,40%)] gap-3">
          <div className="flex flex-col justify-center gap-3">
            <ShoeSize rider={r} onChange={set} label="Shoe size" />
          </div>
          <div className="h-[clamp(150px,26dvh,240px)]">
            <SizePreview sport="skate" heightCm={r.heightCm} weightKg={r.weightKg} value={value} badge={fit.label} fit={r.fit ?? "any"} />
          </div>
        </div>
      )}

      {sport === "snow" && (
        <>
          <ShoeSize rider={r} onChange={set} label="Boot size" />
          <Seg<RiderStyle> label="Riding style" value={r.style} onChange={(v) => set({ style: v })} options={[["park", "Park"], ["all-mountain", "All-mountain"], ["freeride", "Freeride"], ["any", "Everything"]]} />
        </>
      )}
      {sport === "skate" && (
        <Seg<SkateStyle> label="What do you ride?" value={r.skateStyle ?? "street"} onChange={(v) => set({ skateStyle: v })}
          options={[["street", "Street"], ["park", "Park"], ["transition", "Bowl & ramps"], ["cruise", "Cruising"], ["any", "A bit of all"]]} />
      )}
      {sport === "surf" && (
        <Seg<SurfWaves> label="Usual waves" value={r.waves ?? "small"} onChange={(v) => set({ waves: v })} options={[["small", "Small & mushy"], ["medium", "Waist to head"], ["big", "Overhead"]]} />
      )}
      {sport !== "skate" && (
        <Seg<SkillLevel> label="Level" value={r.skill ?? "intermediate"} onChange={(v) => set({ skill: v })}
          options={[["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"], ["expert", "Expert"]]} />
      )}
      <SizeRange fit={fit} onChange={(range) => setR((x) => {
        const next = { ...(x.sizeRange ?? {}) };
        if (range) next[sport] = range;
        else delete next[sport];
        return { ...x, sizeRange: Object.keys(next).length ? next : undefined };
      })} />
      {kidsOk && sport === "skate" && <p className="text-xs text-muted">Kids&apos; shoe sizes: use US kids sizes (e.g. 3 = US kids 3).</p>}
      <p className="text-xs text-muted">{fit.notes.join(" · ")}</p>
    </div>
  );

  return (
    <Sheet
      title="Find my size"
      onClose={onClose}
      footer={
        <button type="button" className="btn-primary w-full" onClick={() => onSave(r, name.trim() || buddy.name, sport)}>
          Show {SPORT_SHORT[sport].toLowerCase()} boards in {fit.rangeLabel}
        </button>
      }
    >
      {body}
    </Sheet>
  );
}
