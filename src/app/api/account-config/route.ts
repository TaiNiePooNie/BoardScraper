import { NextResponse } from "next/server";
import { authConfigured, providers } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Which sign-in options this deployment has (buttons only show for configured ones). */
export function GET() {
  const enabled = authConfigured();
  const p = providers();
  return NextResponse.json({ enabled: enabled && (p.google || p.apple || p.email), providers: enabled ? p : { google: false, apple: false, email: false } });
}
