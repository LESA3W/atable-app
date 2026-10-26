import { NextResponse } from "next/server";
import { verifyAppleIdToken } from "@/lib/oauth";
import { loginOrCreateWithSocial } from "@/lib/db";

export const dynamic = "force-dynamic";

// Sign in / sign up with Apple. The client POSTs Apple's identity token (+ the display name, which
// Apple only reveals on the very first sign-in and never in the token itself). We verify the token
// signature + audience server-side, then find-or-create the member and return a session token.
export async function POST(req: Request) {
  let body: { idToken?: string; identityToken?: string; name?: string ; referralCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const idToken = body.idToken ?? body.identityToken ?? "";
  if (!idToken) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;

  let identity;
  try {
    identity = await verifyAppleIdToken(idToken);
  } catch (err) {
    console.error("apple token verify failed", err);
    return NextResponse.json({ error: "bad_token" }, { status: 401 });
  }
  try {
    const res = await loginOrCreateWithSocial({
      provider: "apple",
      sub: identity.sub,
      email: identity.email,
      name: name ?? identity.name,
      referralCode: typeof body.referralCode === "string" ? body.referralCode.slice(0, 12) : null,
    });
    return NextResponse.json(res); // { token, created, rank?, referralCode? }
  } catch (err) {
    console.error("POST /api/auth/apple db failed", err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
