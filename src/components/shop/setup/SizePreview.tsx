/**
 * Rider silhouette next to their recommended board, to scale. Shows at a glance
 * that the board should reach roughly between chin and nose.
 */
export function SizePreview({ heightCm, weightKg, boardCm, wide }: { heightCm: number; weightKg: number; boardCm: number; wide: boolean }) {
  const H = 170; // px for 210 cm
  const k = H / 210;
  const h = heightCm * k;
  const bmi = weightKg / (heightCm / 100) ** 2;
  const w = Math.max(0.8, Math.min(1.35, bmi / 22)); // body width factor
  const bh = boardCm * k;
  const head = h * 0.13;
  return (
    <svg viewBox={`0 0 160 ${H + 10}`} className="h-44 w-auto" role="img" aria-label={`Rider ${heightCm} cm next to a ${boardCm} cm board`}>
      <line x1="0" x2="160" y1={H + 4} y2={H + 4} stroke="rgba(250,250,247,0.25)" strokeWidth="2" />
      <g transform={`translate(52 ${H + 4 - h})`} fill="#fafaf7" stroke="#15161a" strokeWidth="2.5">
        <circle cx="0" cy={head / 2} r={head / 2} />
        <rect x={-14 * w} y={head + 2} width={28 * w} height={h * 0.38} rx={10 * w} />
        <rect x={-11 * w} y={head + 2 + h * 0.36} width={9 * w} height={h * 0.48 - 2} rx="4" />
        <rect x={2 * w} y={head + 2 + h * 0.36} width={9 * w} height={h * 0.48 - 2} rx="4" />
      </g>
      <g transform={`translate(112 ${H + 4 - bh})`}>
        <rect x={wide ? -12 : -10} y="0" width={wide ? 24 : 20} height={bh} rx="10" fill="#d4ff3a" stroke="#15161a" strokeWidth="2.5" />
        <rect x="-6" y={bh * 0.3} width="12" height="5" rx="2" fill="#ff3d8b" />
        <rect x="-6" y={bh * 0.65} width="12" height="5" rx="2" fill="#ff3d8b" />
      </g>
      <text x="112" y={H + 4 - bh - 6} textAnchor="middle" fill="#d4ff3a" fontSize="11" fontWeight="700" fontFamily="Barlow Condensed, sans-serif">
        {boardCm}{wide ? "W" : ""}
      </text>
    </svg>
  );
}
