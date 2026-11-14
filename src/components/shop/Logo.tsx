"use client";
import { useEffect, useState } from "react";
import { ASSETS } from "@/lib/assets";

let cached: Promise<string | null> | null = null;
/** logo-full.svg as text (works for /assets paths and inlined data URIs); null until the v2 art exists. */
function loadLogoSvg() {
  // Static build without the v2 logo embedded: nothing to fetch.
  if ("__BB_ASSETS" in globalThis && !ASSETS.logoFull.startsWith("data:")) return Promise.resolve(null);
  cached ??= fetch(ASSETS.logoFull)
    .then((r) => (r.ok ? r.text() : null))
    .then((t) => (t && t.includes("bb-icon") ? t.replace(/<\?xml[^>]*>/, "") : null))
    .catch(() => null);
  return cached;
}

/**
 * BoardBuddy logo. With the v2 logo system it morphs between the full logo
 * (icon + wordmark) and the icon alone: the wordmark letters slide and fade
 * out while the icon stays put. Before that art lands it shows the v1 wordmark/mark.
 */
export function Logo({ height = 40, compact = false, className }: { height?: number; compact?: boolean; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadLogoSvg().then((t) => alive && setSvg(t));
    return () => { alive = false; };
  }, []);

  if (!svg) {
    return <img src={compact ? ASSETS.logoMark : ASSETS.logo} alt="BoardBuddy" className={className} style={{ height, width: "auto" }} />;
  }
  return (
    <span
      role="img"
      aria-label="BoardBuddy"
      className={`bb-logo ${compact ? "is-compact" : ""} ${className ?? ""}`}
      style={{ height, width: compact ? height : height * 4 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
