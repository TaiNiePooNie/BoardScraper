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
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full border-2 border-paper font-bold text-ink", TINTS[(n - 1) % TINTS.length], className)}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  ) : (
    <img ref={ref} src={src} alt="" onError={() => setFailed(true)} className={clsx("shrink-0 rounded-full", className)} style={{ width: size, height: size }} />
  );
}

export function AvatarPicker({ value, name, onChange }: { value: number; name: string; onChange: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Profile picture" className="no-scrollbar flex gap-2 overflow-x-auto py-1">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`Picture ${n}`} onClick={() => onChange(n)}
          className={clsx("shrink-0 rounded-full border-[3px] p-0.5 transition", value === n ? "border-acid" : "border-transparent opacity-70 hover:opacity-100")}>
          <Avatar n={n} name={name} size={44} />
        </button>
      ))}
    </div>
  );
}
