"use client";
import { AssetImg } from "@/components/AssetImg";
import { ASSETS } from "@/lib/assets";
import type { Sport } from "@/lib/types";

/** Simple line icons, used until the sticker sport icons land. */
const FALLBACK: Record<Sport, React.ReactNode> = {
  snow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 18 18 4" /><path d="M3 15c-1 2 1 5 3 4l13-13c1-2-2-4-4-3z" /><path d="M8 13l3 3M11 10l3 3" /></svg>
  ),
  skate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 11h18c0 1.7-1.3 3-3 3H6c-1.7 0-3-1.3-3-3z" /><circle cx="7" cy="17" r="1.6" /><circle cx="17" cy="17" r="1.6" /></svg>
  ),
  surf: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2c4 4 4 16 0 20-4-4-4-16 0-20z" /><path d="M12 6v12" /></svg>
  ),
};

export function SportIcon({ sport, className = "h-6 w-6", art = true }: { sport: Sport; className?: string; art?: boolean }) {
  const fb = <span className={`inline-block ${className}`} aria-hidden>{FALLBACK[sport]}</span>;
  if (!art) return fb;
  return <AssetImg src={ASSETS.sport[sport]} alt="" className={className} fallback={fb} />;
}
