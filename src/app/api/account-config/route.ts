import { NextResponse } from "next/server";
import { authConfigured, providers } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Which sign-in options this deployment has (buttons only show for configured ones). */
export function GET() {
  const enabled = authConfigured();
  const p = providers();
  const off = { google: false, apple: false, email: false, password: false, passwordReset: false };
  return NextResponse.json({ enabled, providers: enabled ? p : off });
}
