import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { authConfigured, getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const off = () => NextResponse.json({ error: "Accounts are not set up on this site yet." }, { status: 503 });

export async function GET(req: Request) {
  return authConfigured() ? toNextJsHandler(getAuth()).GET(req) : off();
}
export async function POST(req: Request) {
  return authConfigured() ? toNextJsHandler(getAuth()).POST(req) : off();
}
