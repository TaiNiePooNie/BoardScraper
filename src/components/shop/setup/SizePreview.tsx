"use client";
import { useState } from "react";
import { ASSETS } from "@/lib/assets";
import type { FitPreference } from "@/lib/types";

type Build = "slim" | "regular" | "broad";

/** Build from weight-to-height (BMI); kids have lower thresholds. */
export function buildFor(heightCm: number, weightKg: number, kid: boolean): Build {
  const bmi = weightKg / (heightCm / 100) ** 2;
  const [lo, hi] = kid ? [15.5, 20] : [20.5, 27];
  return bmi < lo ? "slim" : bmi > hi ? "broad" : "regular";
}

const BOX = 190; // px for the tallest rider (210 cm)

/**
 * Rider figure next to their recommended board, to scale. Uses the sticker
 * rider art (man/woman/kid × slim/regular/broad) and falls back to a simple
 * drawing until that art is in /public/assets.
 */
export function SizePreview({ heightCm, weightKg, boardCm, wide, fit }: { heightCm: number; weightKg: number; boardCm: number; wide: boolean; fit: FitPreference }) {
  const [artFailed, setArtFailed] = useState(false);
  const kid = fit === "kids";
  const type = kid ? "kid" : fit === "womens" ? "woman" : "man";
  const build = buildFor(heightCm, weightKg, kid);
  const k = BOX / 210;
  const riderPx = heightCm * k;
  const boardPx = boardCm * k;
  const label = `Rider ${heightCm} cm next to a ${boardCm}${wide ? " cm wide" : " cm"} board`;

  return (
    <div className="relative flex h-[200px] w-[150px] shrink-0 items-end justify-center gap-3" role="img" aria-label={label}>
      <div className="absolute inset-x-0 bottom-0 h-[2px] rounded bg-paper/25" />
      {artFailed ? (
        <FallbackRider heightPx={riderPx} widthFactor={build === "slim" ? 0.85 : build === "broad" ? 1.3 : 1} kid={kid} />
      ) : (
        <img
          key={`${type}-${build}`}
          src={ASSETS.rider[type][build]}
          alt=""
          onError={() => setArtFailed(true)}
          className="w-auto transition-[height] duration-200"
          style={{ height: riderPx }}
        />
      )}
      <div className="flex flex-col items-center">
        <span className="headline mb-1 text-sm text-acid">{boardCm}{wide ? "W" : ""}</span>
        {artFailed ? (
          <span className="block rounded-full border-[3px] border-asphalt bg-acid transition-[height] duration-200" style={{ height: boardPx, width: wide ? 22 : 18 }} />
        ) : (
          <img src={ASSETS.previewBoard} alt="" onError={() => setArtFailed(true)} className="transition-[height] duration-200" style={{ height: boardPx, width: (wide ? 1.15 : 1) * boardPx * (80 / 600) }} />
        )}
      </div>
    </div>
  );
}

/** Interim figure in the sticker style (white body, asphalt outline, lime beanie). */
function FallbackRider({ heightPx, widthFactor, kid }: { heightPx: number; widthFactor: number; kid: boolean }) {
  const w = 60 * widthFactor;
  const headR = kid ? 13 : 10;
  return (
    <svg viewBox={`0 0 ${w + 10} 200`} preserveAspectRatio="none" style={{ height: heightPx, width: (w + 10) * (heightPx / 200) * 0.55 }} aria-hidden>
      <g stroke="#15161a" strokeWidth="3" strokeLinejoin="round">
        <rect x={(w + 10) / 2 - headR * 1.1} y="2" width={headR * 2.2} height={headR * 1.1} rx={headR * 0.5} fill="#d4ff3a" />
        <circle cx={(w + 10) / 2} cy={headR + 10} r={headR} fill="#fafaf7" />
        <rect x="5" y={headR * 2 + 12} width={w} height="78" rx="14" fill="#ff3d8b" />
        <rect x={5 + w * 0.12} y={headR * 2 + 86} width={w * 0.34} height={200 - headR * 2 - 90} rx="6" fill="#2a2c31" />
        <rect x={5 + w * 0.54} y={headR * 2 + 86} width={w * 0.34} height={200 - headR * 2 - 90} rx="6" fill="#2a2c31" />
      </g>
    </svg>
  );
}
