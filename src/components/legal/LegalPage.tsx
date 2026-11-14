import Link from "next/link";
import { ASSETS } from "@/lib/assets";

/** Plain, readable page for policies, in the shop's dark style. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="app-gutter mx-auto max-w-2xl py-8">
      <Link href="/" className="inline-block"><img src={ASSETS.logoFull} alt="BoardBuddy" className="h-9 w-auto" /></Link>
      <h1 className="headline mt-8 text-5xl">{title}</h1>
      <p className="mt-1 text-sm text-paper/55">Last updated {updated}</p>
      <div className="legal mt-6 flex flex-col gap-4 text-[15px] leading-relaxed text-paper/85">{children}</div>
      <p className="mt-10 text-sm"><Link href="/" className="font-semibold text-acid hover:underline">← Back to the shop</Link></p>
    </main>
  );
}

export const contactEmail = () => process.env.CONTACT_EMAIL ?? "boardbuddy.app@gmail.com";
