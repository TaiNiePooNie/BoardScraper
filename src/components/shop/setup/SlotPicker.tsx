"use client";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

const ITEM = 52;

/**
 * Rotating slot / wheel picker: scroll or swipe the numbers, the one in the
 * centre window is selected. Tap a number to jump to it; "Type" for exact input.
 */
export function SlotPicker({ id, label, values, value, onChange, format = String }: {
  id: string;
  label: string;
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [typing, setTyping] = useState(false);
  const index = Math.max(0, values.indexOf(value));

  // Keep the wheel aligned with the value (initial render and external changes).
  useEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.scrollTop - index * ITEM) > 2) el.scrollTo({ top: index * ITEM });
  }, [index]);

  const onScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
      if (values[i] !== value) onChange(values[i]);
    }, 90);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full items-center justify-between">
        <span id={`${id}-label`} className="text-xs font-bold uppercase tracking-[0.14em] text-paper/60">{label}</span>
        <button type="button" onClick={() => setTyping((t) => !t)} className="text-xs font-semibold text-acid underline-offset-2 hover:underline">
          {typing ? "Use wheel" : "Type it"}
        </button>
      </div>
      {typing ? (
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          step={0.5}
          defaultValue={value}
          aria-labelledby={`${id}-label`}
          onBlur={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(values.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a)));
            setTyping(false);
          }}
          className="w-40 rounded-xl border-2 border-acid bg-asphalt px-3 py-3 text-center text-4xl font-bold text-paper outline-none"
        />
      ) : (
        <div className="relative w-40" style={{ height: ITEM * 3 }}>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 rounded-xl border-[3px] border-acid" style={{ height: ITEM }} />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-asphalt to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-asphalt to-transparent" />
          <div
            ref={ref}
            id={id}
            role="listbox"
            aria-labelledby={`${id}-label`}
            aria-activedescendant={`${id}-${index}`}
            tabIndex={0}
            onScroll={onScroll}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const i = Math.min(values.length - 1, Math.max(0, index + (e.key === "ArrowDown" ? 1 : -1)));
                onChange(values[i]);
              }
            }}
            className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll"
            style={{ paddingBlock: ITEM }}
          >
            {values.map((v, i) => (
              <button
                key={v}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === index}
                type="button"
                onClick={() => { onChange(v); ref.current?.scrollTo({ top: i * ITEM, behavior: "smooth" }); }}
                className={clsx("headline flex w-full snap-center items-center justify-center tabular-nums transition", i === index ? "text-4xl text-paper" : "text-2xl text-paper/35")}
                style={{ height: ITEM }}
              >
                {format(v)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
