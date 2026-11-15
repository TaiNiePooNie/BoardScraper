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

/** BoardBuddy logo (icon + wordmark). Inlines logo-full.svg once it has loaded; the v1 wordmark shows until then. */
export function Logo({ height = 40, className }: { height?: number; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadLogoSvg().then((t) => alive && setSvg(t));
    return () => { alive = false; };
  }, []);

  if (!svg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={ASSETS.logo} alt="BoardBuddy" className={className} style={{ height, width: "auto" }} />;
  }
  return <span role="img" aria-label="BoardBuddy" className={`bb-logo ${className ?? ""}`} style={{ height, width: height * 4 }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
