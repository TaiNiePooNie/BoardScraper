/**
 * Transactional email via Resend's HTTP API (no SDK needed).
 * Env: RESEND_API_KEY, EMAIL_FROM (e.g. "BoardBuddy <deals@yourdomain.com>").
 */
export const emailEnabled = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** One-click unsubscribe URL (RFC 8058) for marketing mail. */
  unsubscribeUrl?: string;
}

export async function sendEmail(m: Mail): Promise<void> {
  if (!emailEnabled()) throw new Error("Email is not configured (RESEND_API_KEY / EMAIL_FROM).");
  const headers: Record<string, string> = {};
  if (m.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${m.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text, headers }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Public site URL for links and images in emails. */
export const appUrl = () =>
  (process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
