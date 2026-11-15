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
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-end gap-2">
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</label>
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
            className="w-full rounded-lg border border-ink bg-white px-2 py-0.5 text-right text-xl font-bold tabular-nums text-ink outline-none"
            aria-label={`${label} (${unit})`}
          />
        ) : (
          <button type="button" onClick={() => setTyping(true)} className="w-full whitespace-nowrap text-right text-2xl font-bold tabular-nums text-ink" title="Tap to type">
            {format ? format(value) : value}
            <span className="ml-1 text-sm font-medium text-muted">{unit}</span>
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
