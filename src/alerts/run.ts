/**
 * npm run alerts — send due deal-alert emails. Runs after the daily scrape.
 * Needs DATABASE_URL, RESEND_API_KEY, EMAIL_FROM, APP_URL. Without email config it exits quietly.
 */
import { eq } from "drizzle-orm";
import { openDb } from "@/db/client";
import { alertLog, alertPrefs, user, userData } from "@/db/schema";
import { Buddy } from "@/lib/account";
import { DbRepository } from "@/lib/data/repository";
import { appUrl, emailEnabled, sendEmail } from "@/lib/email/send";
import { dealsDigestEmail } from "@/lib/email/templates";
import { currencyForCountry } from "@/lib/pricing/vat";
import { CurrencyCode } from "@/lib/types";
import { buildDigest, isDue, type LoggedPrice } from "./digest";

async function main() {
  if (!emailEnabled()) {
    console.log("Deal alerts: email not configured (RESEND_API_KEY / EMAIL_FROM), skipping.");
    return;
  }
  const h = await openDb();
  const dryRun = process.argv.includes("--dry-run");
  try {
    const rows = await h.db
      .select({ prefs: alertPrefs, email: user.email, name: user.name, data: userData })
      .from(alertPrefs)
      .innerJoin(user, eq(user.id, alertPrefs.userId))
      .leftJoin(userData, eq(userData.userId, alertPrefs.userId))
      .where(eq(alertPrefs.enabled, true));
    const due = rows.filter((r) => isDue(r.prefs.mode, r.prefs.weekday, r.prefs.lastSentAt));
    console.log(`Deal alerts: ${rows.length} subscribed, ${due.length} due now.`);
    if (!due.length) return;

    const catalog = await new DbRepository(async () => h.db).getCatalog();
    const base = appUrl();
    let sent = 0;

    for (const r of due) {
      const buddies = (r.data?.buddies ?? []).flatMap((b) => {
        const ok = Buddy.safeParse(b);
        return ok.success ? [ok.data] : [];
      });
      const chosen = r.prefs.buddyIds.length ? buddies.filter((b) => r.prefs.buddyIds.includes(b.id)) : buddies;
      if (!chosen.length) continue;
      const country = r.data?.country ?? "DE";
      const currency = CurrencyCode.safeParse(r.data?.currency).data ?? currencyForCountry(country);
      const logRows = await h.db.select().from(alertLog).where(eq(alertLog.userId, r.prefs.userId));
      const log = new Map<string, LoggedPrice>(logRows.map((l) => [String(l.boardId), { price: l.price, currency: l.currency }]));

      const digest = buildDigest({
        catalog, locale: { country, currency, source: "override" }, buddies: chosen, holds: r.data?.holds ?? [],
        mode: r.prefs.mode, priceDrops: r.prefs.priceDrops, log, appUrl: base,
      });

      if (digest.count > 0) {
        const unsubscribeUrl = `${base}/api/unsubscribe?t=${r.prefs.unsubscribeToken}`;
        const first = (r.name || chosen[0].name || "rider").split(" ")[0];
        const intro = r.prefs.mode === "weekly" ? "Your weekly roundup: the best deals that fit your setup right now." : "New deals just landed that fit your setup.";
        const mail = dealsDigestEmail({ name: first, sections: digest.sections, unsubscribeUrl, manageUrl: `${base}/?profile=1`, intro });
        const subject = digest.sections[0]?.title.startsWith("Price drops") ? "Price drop on a board you're holding" : r.prefs.mode === "weekly" ? `${digest.count} board deals that fit you` : "New boards that fit you";
        if (dryRun) console.log(`[dry-run] ${r.email}: ${subject} (${digest.count} boards)`);
        else await sendEmail({ to: r.email, subject, html: mail.html, text: mail.text, unsubscribeUrl });
        sent++;
      }

      if (!dryRun) {
        for (const rec of digest.record) {
          const boardId = Number(rec.boardId);
          if (!Number.isInteger(boardId)) continue;
          await h.db.insert(alertLog).values({ userId: r.prefs.userId, boardId, price: rec.price, currency: rec.currency })
            .onConflictDoUpdate({ target: [alertLog.userId, alertLog.boardId], set: { price: rec.price, currency: rec.currency, sentAt: new Date() } });
        }
        if (digest.count > 0) await h.db.update(alertPrefs).set({ lastSentAt: new Date() }).where(eq(alertPrefs.userId, r.prefs.userId));
      }
    }
    console.log(`Deal alerts: sent ${sent}.`);
  } finally {
    await h.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
