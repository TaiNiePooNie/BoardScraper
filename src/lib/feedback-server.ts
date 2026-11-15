import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isOwnerEmail, sessionUser } from "@/lib/auth";

const secret = () => process.env.BETTER_AUTH_SECRET ?? process.env.RESTOCK_PASSCODE ?? "dev-feedback-secret";

/** Upload token for one feedback message (only the sender's browser gets it). */
export const uploadToken = (id: number) => createHmac("sha256", secret()).update(`feedback:${id}`).digest("base64url");
export function validToken(id: number, token: string | null): boolean {
  if (!token) return false;
  const a = Buffer.from(uploadToken(id));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Uploads are accepted for this long after the message was sent. */
export const UPLOAD_WINDOW_MS = 2 * 60 * 60 * 1000;

export function ipHash(headers: Headers): string | null {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip");
  return ip ? createHash("sha256").update(`${secret()}|${ip}`).digest("hex").slice(0, 32) : null;
}

/** Signed-in, verified owner (OWNER_EMAILS), or null. */
export async function ownerUser(headers: Headers) {
  const u = await sessionUser(headers);
  return u && u.emailVerified && isOwnerEmail(u.email) ? u : null;
}
