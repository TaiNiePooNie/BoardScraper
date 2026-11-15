import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { feedback } from "@/db/schema";
import { serverDb } from "@/db/server";
import { ownerUser } from "@/lib/feedback-server";

export const dynamic = "force-dynamic";

/** Owner: mark a message new / read / done, or delete it. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ownerUser(req.headers))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const body = z.object({ status: z.enum(["new", "read", "done"]) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  await serverDb().update(feedback).set({ status: body.data.status }).where(eq(feedback.id, Number((await params).id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ownerUser(req.headers))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await serverDb().delete(feedback).where(eq(feedback.id, Number((await params).id)));
  return NextResponse.json({ ok: true });
}
