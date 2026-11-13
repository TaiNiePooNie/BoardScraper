const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** HTML → plain text (good enough for keyword spec extraction). */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-z]+);/gi, (m, e) => ENTITIES[e.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** Parses "€ 1.299,95", "$549.99", "£399" → number. */
export function parsePrice(text: string | number | null | undefined): number | null {
  if (typeof text === "number") return Number.isFinite(text) ? text : null;
  if (!text) return null;
  const cleaned = text.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  const lastSep = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  const decimals = lastSep >= 0 && cleaned.length - lastSep - 1 === 2;
  const intPart = decimals ? cleaned.slice(0, lastSep) : cleaned;
  const dec = decimals ? cleaned.slice(lastSep + 1) : "0";
  const n = Number(`${intPart.replace(/[.,]/g, "")}.${dec}`);
  return Number.isFinite(n) ? n : null;
}
