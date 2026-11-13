import type { Recommendation } from "@/lib/sizing";

export function RecommendationPanel({ rec }: { rec: Recommendation }) {
  const stats = [
    { k: "Ideal length", v: `${rec.idealLengthCm} cm`, sub: `${rec.lengthRangeCm[0]}–${rec.lengthRangeCm[1]} cm` },
    { k: "Waist", v: rec.requiresWide ? "Wide (W)" : "Regular", sub: `Boot US ${rec.bootSizeUS}` },
    { k: "Flex", v: `${rec.flexRange[0]}–${rec.flexRange[1]}`, sub: "of 10" },
    { k: "Profiles", v: rec.profiles.slice(0, 2).join(", "), sub: rec.profiles.slice(2).join(", ") },
  ];
  return (
    <section className="panel p-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k}>
            <div className="text-xs uppercase tracking-wide text-slate-500">{s.k}</div>
            <div className="text-lg font-bold capitalize">{s.v}</div>
            <div className="text-xs capitalize text-slate-500">{s.sub}</div>
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 text-xs text-slate-500">
        {rec.notes.map((n) => <li key={n}>• {n}</li>)}
      </ul>
    </section>
  );
}
