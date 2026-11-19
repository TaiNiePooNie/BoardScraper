"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ASSETS } from "@/lib/assets";

/** Designed blank demo board, shown when a scraped photo can't load. */
export const BOARD_PLACEHOLDER = ASSETS.boardPlaceholder;

/**
 * Shop photo URL → our image proxy (/api/img): trims the shop's white canvas,
 * resizes and caches. Static builds embed photos as data URIs and skip the proxy.
 */
export function proxied(src: string, height: number, cut = false): string {
  const isStatic = typeof globalThis !== "undefined" && "__BB_ASSETS" in globalThis;
  if (!/^https?:\/\//.test(src) || isStatic) return src;
  return `/api/img?src=${encodeURIComponent(src)}&h=${height}${cut ? "&cut=1" : ""}`;
}

export function ProductImg({ src, alt, className, loading, style, size = 800, placeholder = BOARD_PLACEHOLDER, fillAspect, coverClassName, cut, onLoad }: {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  style?: React.CSSProperties;
  /** Target pixel height for the proxy. */
  size?: number;
  /** Shown when the photo can't load. */
  placeholder?: string;
  /** Box aspect (w/h). Photos shot on their own backdrop at about this aspect fill the box (coverClassName) instead of floating. */
  fillAspect?: number;
  coverClassName?: string;
  /** Remove the plain studio background (transparent cut-out). */
  cut?: boolean;
  onLoad?: (img: HTMLImageElement) => void;
}) {
  const [cover, setCover] = useState(false);
  // 0 = proxied, 1 = original URL, 2 = placeholder
  const [attempt, setAttempt] = useState(0);
  const url = !src || attempt >= 3 ? BOARD_PLACEHOLDER : attempt === 2 ? placeholder : attempt === 1 ? src : proxied(src, size, cut);
  return (
    <img
      src={url}
      alt={alt}
      className={cover && coverClassName ? coverClassName : className}
      loading={loading}
      onLoad={fillAspect || onLoad ? (e) => {
        const img = e.currentTarget;
        if (fillAspect) {
          const r = img.naturalWidth / Math.max(1, img.naturalHeight);
          setCover(Math.abs(r - fillAspect) / fillAspect < 0.12);
        }
        onLoad?.(img);
      } : undefined}
      style={style}
      draggable={false}
      onError={() => setAttempt((a) => (url === BOARD_PLACEHOLDER ? 3 : url === src ? Math.max(2, a + 1) : a + 1))}
    />
  );
}
