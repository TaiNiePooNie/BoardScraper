import { headers } from "next/headers";
import { resolveLocale } from "@/lib/geo";
import { DealExplorer } from "@/components/DealExplorer";
import { AssetImg } from "@/components/AssetImg";
import { ASSETS } from "@/lib/assets";

export default async function Home() {
  const locale = resolveLocale(await headers());
  return (
    <main>
      <header className="relative isolate overflow-hidden">
        <AssetImg src={ASSETS.heroBackground} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/70 via-ink/40 to-snow dark:to-ink" />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
          <nav className="flex items-center gap-3">
            <AssetImg src={ASSETS.logo} alt="BoardScraper" className="h-9 w-auto" fallback={<span className="text-xl font-black tracking-tight text-white">BoardScraper</span>} />
          </nav>
          <h1 className="mt-10 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">
            Snowboard deals, sized for <span className="text-glacier">you</span>.
          </h1>
          <p className="mt-3 max-w-xl text-slate-200">
            Enter your weight, boots and style. We compute your ideal board and grade every live deal against MSRP and price history.
          </p>
        </div>
      </header>
      <DealExplorer initialLocale={locale} />
    </main>
  );
}
