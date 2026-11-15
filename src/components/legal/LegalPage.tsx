import Link from "next/link";
import { ASSETS } from "@/lib/assets";

/** Plain, readable page for policies, in the store's light style. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line">
        <div className="app-gutter mx-auto flex h-14 max-w-2xl items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Link href="/" className="inline-flex min-h-11 items-center" aria-label="BoardBuddy home"><img src={ASSETS.logoFull} alt="BoardBuddy" className="h-[30px] w-auto" /></Link>
        </div>
      </header>
      <main className="app-gutter mx-auto max-w-2xl pb-16 pt-8">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">Last updated {updated}</p>
        <div className="prose-legal mt-6">{children}</div>
        <p className="mt-10"><Link href="/" className="btn-ghost">Back to the shop</Link></p>
      </main>
    </>
  );
}

export const contactEmail = () => process.env.CONTACT_EMAIL ?? "boardbuddysupport@googlegroups.com";
