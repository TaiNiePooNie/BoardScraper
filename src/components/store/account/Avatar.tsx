"use client";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { ASSETS } from "@/lib/assets";

const TINTS = ["bg-acid", "bg-pink", "bg-ice", "bg-orange"];

/** Sticker avatar (art avatar-1…8), falling back to a coloured initial until the art exists. */
export function Avatar({ n, name, size = 36, className }: { n: number; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const src = ASSETS.avatars[(n - 1 + 8) % 8];
  // The image may have failed before hydration attached onError.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);
  return failed ? (
    <span
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink", TINTS[(n - 1 + 8) % TINTS.length], className)}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt="" onError={() => setFailed(true)} className={clsx("shrink-0 rounded-full", className)} style={{ width: size, height: size }} />
  );
}
