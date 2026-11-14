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
export function proxied(src: string, height: number): string {
  const isStatic = typeof globalThis !== "undefined" && "__BB_ASSETS" in globalThis;
  if (!/^https?:\/\//.test(src) || isStatic) return src;
  return `/api/img?src=${encodeURIComponent(src)}&h=${height}`;
}

export function ProductImg({ src, alt, className, loading, style, size = 800 }: {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  style?: React.CSSProperties;
  /** Target pixel height for the proxy. */
  size?: number;
}) {
  // 0 = proxied, 1 = original URL, 2 = placeholder
  const [attempt, setAttempt] = useState(0);
  const url = !src || attempt >= 2 ? BOARD_PLACEHOLDER : attempt === 1 ? src : proxied(src, size);
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading={loading}
      style={style}
      draggable={false}
      onError={() => setAttempt((a) => (url === src || url === BOARD_PLACEHOLDER ? 2 : a + 1))}
    />
  );
}
