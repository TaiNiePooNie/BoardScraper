import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { alertPrefs, userData } from "@/db/schema";
import { serverDb } from "@/db/server";
import { DEFAULT_ALERTS, MePayload } from "@/lib/account";
import { sessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** The signed-in user's saved setup: buddies, active buddy, holds and alert settings. */
export async function GET(req: Request) {
  const u = await sessionUser(req.headers);
  if (!u) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const db = serverDb();
  const [data] = await db.select().from(userData).where(eq(userData.userId, u.id));
  const [prefs] = await db.select().from(alertPrefs).where(eq(alertPrefs.userId, u.id));
  return NextResponse.json({
    user: { id: u.id, name: u.name, email: u.email, image: u.image, emailVerified: u.emailVerified },
    data: data
      ? {
          buddies: data.buddies,
          activeId: data.activeId,
          holds: data.holds,
          alerts: prefs ? { enabled: prefs.enabled, mode: prefs.mode, weekday: prefs.weekday, priceDrops: prefs.priceDrops, buddyIds: prefs.buddyIds } : DEFAULT_ALERTS,
        }
      : null,
  });
}

export async function PUT(req: Request) {
  const u = await sessionUser(req.headers);
  if (!u) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = MePayload.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const { buddies, activeId, holds, alerts, country = null, currency = null } = parsed.data;
  const db = serverDb();
  const now = new Date();
  await db
    .insert(userData)
    .values({ userId: u.id, buddies, activeId, holds, country, currency, updatedAt: now })
    .onConflictDoUpdate({ target: userData.userId, set: { buddies, activeId, holds, ...(country ? { country, currency } : {}), updatedAt: now } });
  await db
    .insert(alertPrefs)
    .values({ userId: u.id, ...alerts, unsubscribeToken: randomBytes(24).toString("base64url"), updatedAt: now })
    .onConflictDoUpdate({ target: alertPrefs.userId, set: { ...alerts, updatedAt: now } });
  return NextResponse.json({ ok: true });
}
