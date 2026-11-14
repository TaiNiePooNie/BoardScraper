"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

import { ASSETS } from "@/lib/assets";

/** Designed blank demo board, shown when a scraped photo can't load (hotlink/CSP blocks, dead URLs). */
export const BOARD_PLACEHOLDER = ASSETS.boardPlaceholder;

export function ProductImg({ src, alt, className, loading, style }: { src: string; alt: string; className?: string; loading?: "lazy" | "eager"; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false);
  return <img src={failed || !src ? BOARD_PLACEHOLDER : src} alt={alt} className={className} loading={loading} style={style} draggable={false} onError={() => setFailed(true)} />;
}
