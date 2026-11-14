"use client";
import clsx from "clsx";

export interface Choice<T extends string> {
  id: T;
  label: string;
  hint?: string;
  icon?: string;
}

/** Big tappable sticker cards; the selected one pops (acid edge, slight tilt). */
export function ChoiceCards<T extends string>({ name, choices, value, onChange, columns = 3 }: {
  name: string;
  choices: Choice<T>[];
  value: T;
  onChange: (v: T) => void;
  columns?: 2 | 3;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={clsx("grid gap-3", columns === 2 ? "grid-cols-2" : "grid-cols-3")}>
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
              "flex flex-col items-center gap-1.5 rounded-2xl border-[3px] px-2 py-3 text-center transition",
              on ? "border-acid bg-acid/10 shadow-[0_5px_0_#15161a]" : "border-paper/15 bg-asphalt/60 hover:border-paper/40",
            )}
            style={{ transform: on ? `rotate(${i % 2 ? 1.5 : -1.5}deg) scale(1.03)` : undefined }}
          >
            {c.icon && <img src={c.icon} alt="" className="h-14 w-14" />}
            <span className="headline text-lg text-paper">{c.label}</span>
            {c.hint && <span className="text-[11px] leading-tight text-paper/60">{c.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
