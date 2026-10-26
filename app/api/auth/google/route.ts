import { NextResponse } from "next/server";
import { verifyGoogleIdToken } from "@/lib/oauth";
import { loginOrCreateWithSocial } from "@/lib/db";

export const dynamic = "force-dynamic";

// Sign in / sign up with Google. The client (web Google Identity Services, or the native plugin on
// iOS) POSTs a Google ID token. We verify its signature + audience server-side, then find-or-create
// the member and return the same kind of session token as email/password login.
export async function POST(req: Request) {
  let body: { idToken?: string; credential?: string ; referralCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const idToken = body.idToken ?? body.credential ?? "";
  if (!idToken) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  let identity;
  try {
    identity = await verifyGoogleIdToken(idToken);
  } catch (err) {
    // Bad/expired token or wrong audience -> the client's fault, not ours.
    console.error("google token verify failed", err);
    return NextResponse.json({ error: "bad_token" }, { status: 401 });
  }
  try {
    const res = await loginOrCreateWithSocial({
      provider: "google",
      ...identity,
      referralCode: typeof body.referralCode === "string" ? body.referralCode.slice(0, 12) : null,
    });
    return NextResponse.json(res); // { token, created, rank? }
  } catch (err) {
    console.error("POST /api/auth/google db failed", err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
