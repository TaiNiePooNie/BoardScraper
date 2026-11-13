"use client";
import { useState, type ReactNode } from "react";

/**
 * <img> for design-agent assets in /public/assets. Until ChatGPT delivers a file
 * it 404s — we hide it (or show `fallback`) so the layout never breaks.
 */
export function AssetImg({ src, alt, className, fallback = null }: { src: string; alt: string; className?: string; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
