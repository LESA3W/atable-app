import { NextResponse } from "next/server";
import { loginWithEmail } from "@/lib/db";

export const dynamic = "force-dynamic";

// Log in with an existing account (email + password) -> session token.
export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const res = await loginWithEmail(email, password);
    if (!res) return NextResponse.json({ error: "bad_credentials" }, { status: 401 });
    return NextResponse.json(res); // { token }
  } catch (err) {
    console.error("POST /api/login failed", err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
