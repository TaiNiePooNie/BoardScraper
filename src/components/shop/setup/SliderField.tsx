"use client";
import { useState } from "react";

/** Big readable value + slider. Tap the value to type an exact number. */
export function SliderField({
  id, label, value, min, max, step = 1, unit, onChange, format,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const [typing, setTyping] = useState(false);
  const fill = `${((value - min) / (max - min)) * 100}%`;
  const commit = (raw: string) => {
    const n = Number(raw.replace(",", "."));
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
    setTyping(false);
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-[0.14em] text-paper/60">{label}</label>
        {typing ? (
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            defaultValue={value}
            min={min}
            max={max}
            step={step}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
            className="w-28 rounded-lg border-2 border-acid bg-asphalt px-2 py-1 text-right text-2xl font-bold tabular-nums text-paper outline-none"
            aria-label={`${label} (${unit})`}
          />
        ) : (
          <button type="button" onClick={() => setTyping(true)} className="headline text-4xl tabular-nums text-paper" title="Tap to type">
            {format ? format(value) : value}
            <span className="ml-1 text-lg text-paper/60">{unit}</span>
          </button>
        )}
      </div>
      <input
        id={id}
        type="range"
        className="bb-range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ["--fill" as string]: fill }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
