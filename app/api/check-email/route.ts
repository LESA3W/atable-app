import { NextResponse } from "next/server";
import { emailInUse } from "@/lib/db";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lightweight availability check so onboarding can warn about a taken email right after
// it is entered, instead of only failing at account creation.
export async function GET(req: Request) {
  const email = (new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ taken: false });
  try {
    return NextResponse.json({ taken: await emailInUse(email) });
  } catch (err) {
    console.error("GET /api/check-email failed", err);
    // On error, don't block: the final create-account still guards uniqueness.
    return NextResponse.json({ taken: false });
  }
}
