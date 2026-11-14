"use client";
import clsx from "clsx";
import { AssetImg } from "../../AssetImg";

export interface Choice<T extends string> {
  id: T;
  label: string;
  hint?: string;
  icon?: string;
}

/** Big tappable sticker cards; the selected one pops (acid edge, slight tilt). */
export function ChoiceCards<T extends string>({ name, choices, value, onChange, columns = 3, compact = false }: {
  name: string;
  choices: Choice<T>[];
  value: T;
  onChange: (v: T) => void;
  columns?: 2 | 3 | 4;
  /** Smaller cards (icon + label only). */
  compact?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={clsx("grid", compact ? "gap-2" : "gap-3", columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-4" : "grid-cols-3")}>
      {choices.map((c, i) => {
        const on = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(c.id)}
            className={clsx(
              "flex flex-col items-center gap-1.5 rounded-2xl border-[3px] text-center transition",
              compact ? "px-1 py-2 [@media(max-height:640px)]:py-1" : "px-2 py-3 [@media(max-height:640px)]:py-1.5",
              on ? "border-acid bg-acid/10 shadow-[0_5px_0_#15161a]" : "border-paper/15 bg-asphalt/60 hover:border-paper/40",
            )}
            style={{ transform: on ? `rotate(${i % 2 ? 1.5 : -1.5}deg) scale(1.03)` : undefined }}
          >
            {c.icon && <AssetImg src={c.icon} alt="" className={compact ? "h-10 w-10 [@media(max-height:640px)]:h-7 [@media(max-height:640px)]:w-7" : "h-14 w-14 [@media(max-height:640px)]:h-9 [@media(max-height:640px)]:w-9"} />}
            <span className={clsx("headline text-paper", compact ? "text-base" : "text-lg")}>{c.label}</span>
            {c.hint && <span className="text-[11px] leading-tight text-paper/60 [@media(max-height:640px)]:hidden">{c.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
