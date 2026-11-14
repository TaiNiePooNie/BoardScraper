/**
 * Accounts (server only). Better Auth with:
 *  - Google        (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)
 *  - Apple         (APPLE_CLIENT_ID / APPLE_CLIENT_SECRET)
 *  - Email link    (RESEND_API_KEY / EMAIL_FROM) — passwordless magic link
 * Required: BETTER_AUTH_SECRET, DATABASE_URL. Optional: BETTER_AUTH_URL (defaults to the Vercel URL).
 * Each provider turns on only when its keys are set; guests never need any of this.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import * as schema from "@/db/schema";
import { serverDb } from "@/db/server";
import { appUrl, emailEnabled, sendEmail } from "./email/send";
import { magicLinkEmail } from "./email/templates";

export const authConfigured = () => !!process.env.BETTER_AUTH_SECRET && !!process.env.DATABASE_URL;

export const providers = () => ({
  google: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
  apple: !!process.env.APPLE_CLIENT_ID && !!process.env.APPLE_CLIENT_SECRET,
  email: emailEnabled(),
});

function create() {
  const p = providers();
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: appUrl(),
    database: drizzleAdapter(serverDb(), {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    trustedOrigins: p.apple ? ["https://appleid.apple.com"] : [],
    socialProviders: {
      ...(p.google ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } } : {}),
      ...(p.apple ? { apple: { clientId: process.env.APPLE_CLIENT_ID!, clientSecret: process.env.APPLE_CLIENT_SECRET! } } : {}),
    },
    account: { accountLinking: { enabled: true, trustedProviders: ["google", "apple"] } },
    user: { deleteUser: { enabled: true } },
    session: { expiresIn: 60 * 60 * 24 * 60, updateAge: 60 * 60 * 24 }, // 60 days, refreshed daily
    plugins: [
      magicLink({
        expiresIn: 300,
        sendMagicLink: async ({ email, url }) => {
          const m = magicLinkEmail(url);
          await sendEmail({ to: email, subject: m.subject, html: m.html, text: m.text });
        },
      }),
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof create> | null = null;
export function getAuth() {
  if (!authConfigured()) throw new Error("Accounts are not configured (BETTER_AUTH_SECRET).");
  instance ??= create();
  return instance;
}

/** Signed-in user for an API request, or null. */
export async function sessionUser(headers: Headers) {
  if (!authConfigured()) return null;
  const s = await getAuth().api.getSession({ headers });
  return s?.user ?? null;
}
