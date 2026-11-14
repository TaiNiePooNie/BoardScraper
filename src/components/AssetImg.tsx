"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * <img> for design-agent assets in /public/assets. Until ChatGPT delivers a file
 * it 404s — we hide it (or show `fallback`) so the layout never breaks.
 */
export function AssetImg({ src, alt, className, fallback = null }: { src: string; alt: string; className?: string; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // Missing art can fail before hydration attaches onError: check once mounted.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);
  if (failed) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
