"use client";
/* The "board page" look: giant fitted word and a board lying sideways (see src/lib/look.ts). */
import clsx from "clsx";
import { useLayoutEffect, useRef, useState } from "react";
import { ProductImg } from "@/components/ProductImg";

const useIsoLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

/**
 * A word set as large as fits its box (one line), between `min` and `max` px.
 * Server render guesses the size from the letter count, then it's measured exactly.
 */
export function FitWord({ children, max = 150, min = 36, as: Tag = "h2", className, style }: {
  children: string;
  max?: number;
  min?: number;
  as?: "h1" | "h2" | "p" | "span";
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const avail = el.clientWidth;
      if (!avail) return;
      el.style.fontSize = "100px";
      const size = Math.max(min, Math.min(max, (100 * avail) / Math.max(1, el.scrollWidth)));
      el.style.fontSize = `${Math.floor(size * 10) / 10}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [children, max, min]);
  const guess = `min(${max}px, max(${min}px, calc((100vw - 40px) / ${(children.length * 0.72 + 0.2).toFixed(2)})))`;
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={clsx("display-word", className)} style={{ fontSize: guess, ...style }}>{children}</Tag>
  );
}

/**
 * Board photo turned sideways (cut out of its background) with a drop shadow, at most
 * `maxHeight` px tall. The box keeps the turned photo's proportions once it has loaded.
 */
export function SidewaysBoard({ src, alt, placeholder, maxHeight = 190, className, tilt = 4, eager }: {
  src: string;
  alt: string;
  placeholder: string;
  maxHeight?: number;
  className?: string;
  /** Degrees off horizontal. */
  tilt?: number;
  eager?: boolean;
}) {
  // r = turned width / turned height = photo height / photo width (boards are tall: ~3).
  const [r, setR] = useState(3);
  return (
    <div className={clsx("relative mx-auto", className)} style={{ aspectRatio: String(r), width: `min(100%, ${Math.round(maxHeight * r)}px)` }}>
      <ProductImg
        src={src}
        alt={alt}
        cut
        size={1200}
        loading={eager ? "eager" : "lazy"}
        placeholder={placeholder}
        onLoad={(img) => { if (img.naturalWidth && img.naturalHeight) setR(img.naturalHeight / img.naturalWidth); }}
        className="absolute left-1/2 top-1/2 max-w-none object-contain"
        style={{
          width: `${100 / r}%`,
          height: `${100 * r}%`,
          transform: `translate(-50%, -50%) rotate(${-90 - tilt}deg)`,
          // The shadow is drawn before the turn: "left" ends up below the board.
          filter: "drop-shadow(-18px 0 14px rgb(0 0 0 / 0.3)) drop-shadow(-4px 0 4px rgb(0 0 0 / 0.18))",
        }}
      />
    </div>
  );
}
