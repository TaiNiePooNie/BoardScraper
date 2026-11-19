"use client";
/* The "board page" look: giant fitted word and a board lying sideways (see src/lib/look.ts). */
import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
      // The inner span's width is the text's own width (the block itself is as wide as its box).
      const text = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.scrollWidth;
      const size = Math.max(min, Math.min(max, (100 * avail) / Math.max(1, text)));
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
    <Tag ref={ref as any} className={clsx("display-word", className)} style={{ fontSize: guess, ...style }}><span className="inline-block">{children}</span></Tag>
  );
}

/**
 * Board photo turned sideways on a white sticker card (the photo keeps its own, whitened
 * background, so every shop photo works), tilted, with a drop shadow. At most `maxHeight`
 * px tall; the box takes the turned card's proportions once the photo has loaded.
 */
export function SidewaysBoard({ src, cutout, alt, placeholder, maxHeight = 190, className, tilt = 4, eager }: {
  src: string;
  /** AI cut-out (transparent): the board floats without a card. Falls back to the card if it fails. */
  cutout?: string;
  alt: string;
  placeholder: string;
  maxHeight?: number;
  className?: string;
  /** Degrees off horizontal. */
  tilt?: number;
  eager?: boolean;
}) {
  const [cutFailed, setCutFailed] = useState(false);
  // Photo size (px) once loaded; boards are tall (~1:3) until then.
  const [dim, setDim] = useState({ w: 1, h: 3 });
  if (cutout && !cutFailed) return <FloatingBoard src={cutout} alt={alt} maxHeight={maxHeight} className={className} tilt={tilt} eager={eager} onError={() => setCutFailed(true)} />;
  const pad = 0.07 * Math.min(dim.w, dim.h); // white margin around the photo
  const cw = dim.w + 2 * pad, ch = dim.h + 2 * pad;
  const r = ch / cw; // turned card: width / height
  return (
    <div className={clsx("relative mx-auto", className)} style={{ aspectRatio: String(r), width: `min(100%, ${Math.round(maxHeight * r)}px)` }}>
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden rounded-2xl bg-[#fff]"
        style={{
          width: `${100 / r}%`,
          height: `${100 * r}%`,
          transform: `translate(-50%, -50%) rotate(${-90 - tilt}deg)`,
          // Drawn before the turn: "left" ends up below the card.
          boxShadow: "-16px 0 26px rgb(0 0 0 / 0.28), -3px 0 6px rgb(0 0 0 / 0.16)",
        }}
      >
        <ProductImg
          src={src}
          alt={alt}
          size={1200}
          loading={eager ? "eager" : "lazy"}
          placeholder={placeholder}
          onLoad={(img) => { if (img.naturalWidth && img.naturalHeight) setDim({ w: img.naturalWidth, h: img.naturalHeight }); }}
          className="absolute object-contain"
          style={{ left: `${(100 * pad) / cw}%`, right: `${(100 * pad) / cw}%`, top: `${(100 * pad) / ch}%`, bottom: `${(100 * pad) / ch}%`, width: `${(100 * dim.w) / cw}%`, height: `${(100 * dim.h) / ch}%` }}
        />
      </div>
    </div>
  );
}

/** A transparent cut-out turned sideways, floating with a drop shadow. */
function FloatingBoard({ src, alt, maxHeight, className, tilt, eager, onError }: { src: string; alt: string; maxHeight: number; className?: string; tilt: number; eager?: boolean; onError: () => void }) {
  const [r, setR] = useState(3); // turned width / height = photo height / width
  return (
    <div className={clsx("relative mx-auto", className)} style={{ aspectRatio: String(r), width: `min(100%, ${Math.round(maxHeight * r)}px)` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        draggable={false}
        onError={onError}
        onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth && i.naturalHeight) setR(i.naturalHeight / i.naturalWidth); }}
        className="absolute left-1/2 top-1/2 max-w-none object-contain"
        style={{
          width: `${100 / r}%`,
          height: `${100 * r}%`,
          transform: `translate(-50%, -50%) rotate(${-90 - tilt}deg)`,
          // Drawn before the turn: "left" ends up below the board.
          filter: "drop-shadow(-18px 0 14px rgb(0 0 0 / 0.3)) drop-shadow(-4px 0 4px rgb(0 0 0 / 0.18))",
        }}
      />
    </div>
  );
}

/** True on tablets and desktops (≥ 768px). */
export function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(min-width: 768px)");
    const set = () => setWide(!!mq?.matches);
    set();
    mq?.addEventListener("change", set);
    return () => mq?.removeEventListener("change", set);
  }, []);
  return wide;
}
