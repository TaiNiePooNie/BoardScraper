import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { alertPrefs } from "@/db/schema";
import { serverDb } from "@/db/server";

export const dynamic = "force-dynamic";

async function off(token: string | null) {
  if (!token || token.length < 16) return false;
  const res = await serverDb().update(alertPrefs).set({ enabled: false, updatedAt: new Date() }).where(eq(alertPrefs.unsubscribeToken, token)).returning({ id: alertPrefs.userId });
  return res.length > 0;
}

/** Link in the email footer: turn alerts off, then show the shop with a confirmation. */
export async function GET(req: NextRequest) {
  await off(req.nextUrl.searchParams.get("t"));
  return NextResponse.redirect(new URL("/?unsubscribed=1", req.nextUrl.origin), 303);
}

/** RFC 8058 one-click unsubscribe from the mail client. */
export async function POST(req: NextRequest) {
  await off(req.nextUrl.searchParams.get("t"));
  return new NextResponse(null, { status: 200 });
}
