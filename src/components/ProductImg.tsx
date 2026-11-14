"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

/** Neutral board silhouette shown when a scraped image can't load (hotlink/CSP blocks, dead URLs). */
export const BOARD_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#e8edf3"/><rect x="160" y="40" width="80" height="420" rx="40" fill="#b8c4d3"/><rect x="172" y="150" width="56" height="34" rx="8" fill="#94a3b8"/><rect x="172" y="316" width="56" height="34" rx="8" fill="#94a3b8"/></svg>',
)}`;

export function ProductImg({ src, alt, className, loading, style }: { src: string; alt: string; className?: string; loading?: "lazy" | "eager"; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false);
  return <img src={failed ? BOARD_PLACEHOLDER : src} alt={alt} className={className} loading={loading} style={style} draggable={false} onError={() => setFailed(true)} />;
}
