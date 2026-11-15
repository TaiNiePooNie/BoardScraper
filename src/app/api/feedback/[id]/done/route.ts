import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { feedback, feedbackMedia } from "@/db/schema";
import { serverDb } from "@/db/server";
import { KIND_LABEL } from "@/lib/feedback";
import { validToken } from "@/lib/feedback-server";
import { appUrl, emailEnabled, sendEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Sender finished uploading: notify the owners by email (when email is set up). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!validToken(id, req.headers.get("x-upload-token"))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const owners = (process.env.OWNER_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!emailEnabled() || !owners.length) return NextResponse.json({ ok: true, emailed: false });

  const db = serverDb();
  const [f] = await db.select().from(feedback).where(eq(feedback.id, id));
  if (!f) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const files = await db.select({ filename: feedbackMedia.filename }).from(feedbackMedia).where(eq(feedbackMedia.feedbackId, id));
  const link = `${appUrl()}/?profile=1&inbox=1`;
  const subject = `[BoardBuddy] ${KIND_LABEL[f.kind]}: ${f.subject}`;
  const text = `${KIND_LABEL[f.kind]} from ${f.email ?? "a guest (no email)"}\n\n${f.subject}\n\n${f.message}\n\n${files.length ? `Attachments: ${files.map((x) => x.filename).join(", ")}\n\n` : ""}Open the inbox: ${link}`;
  const html = `<p><b>${esc(KIND_LABEL[f.kind])}</b> from ${esc(f.email ?? "a guest (no email)")}</p><h2 style="margin:0 0 8px">${esc(f.subject)}</h2><p style="white-space:pre-wrap">${esc(f.message)}</p>${files.length ? `<p>Attachments: ${files.map((x) => esc(x.filename)).join(", ")}</p>` : ""}<p><a href="${link}">Open the feedback inbox</a></p>`;
  await Promise.allSettled(owners.map((to) => sendEmail({ to, subject, text, html, replyTo: f.email ?? undefined })));
  return NextResponse.json({ ok: true, emailed: true });
}
