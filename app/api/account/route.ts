import { NextResponse } from "next/server";
import { createAccount, deleteAccount, emailInUse, hashPassword, requireMember, AuthError } from "@/lib/db";
import { computeInitials, randomColor } from "@/lib/initials";
import { computeAge } from "@/lib/age";
import { RESTRICTION_IDS } from "@/lib/diets";
import { isAcceptablePassword, isValidEmail } from "@/lib/password";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function str(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}
function int(v: unknown, lo: number, hi: number): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? Math.floor(n) : undefined;
}

// Sign up: standalone account. email + password + profile (prénom, nom, date de
// naissance, restrictions) + onboarding answers (household, goals, how-heard, shopping).
export async function POST(req: Request) {
  let body: {
    email?: string;
    password?: string;
    name?: string;
    lastName?: string;
    birthdate?: string;
    restrictions?: unknown;
    meta?: Record<string, unknown>;
    // Referral code from the ?r= link. Kept OUT of `meta` on purpose: meta is a strict whitelist
    // persisted verbatim into members.onboarding, so it would be silently dropped there.
    referralCode?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim(); // prénom
  if (!isValidEmail(email)) return NextResponse.json({ error: "bad_email" }, { status: 400 });
  if (!isAcceptablePassword(password)) return NextResponse.json({ error: "weak_password" }, { status: 400 });
  if (name.length < 1 || name.length > 40) {
    return NextResponse.json({ error: "bad_name" }, { status: 400 });
  }
  if (await emailInUse(email)) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }
  const lastName = (body.lastName ?? "").trim() || null;
  // Store the date of birth (source of truth); age is derived from it on read.
  const birthdate = DATE_RE.test((body.birthdate ?? "").trim()) ? body.birthdate!.trim() : null;
  const age = computeAge(birthdate);
  const restrictions = Array.isArray(body.restrictions)
    ? [...new Set(body.restrictions.filter((r): r is string => RESTRICTION_IDS.includes(r as never)))]
    : [];

  // Onboarding answers, bounded so a client can't stuff arbitrary data.
  let onboarding: Record<string, unknown> | null = null;
  if (body.meta && typeof body.meta === "object") {
    const src = body.meta as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const h = src.household as Record<string, unknown> | undefined;
    if (h && typeof h === "object") {
      out.household = { adults: int(h.adults, 0, 20) ?? 1, children: int(h.children, 0, 20) ?? 0 };
    }
    if (Array.isArray(src.goals)) {
      out.goals = src.goals.filter((x) => typeof x === "string").slice(0, 10).map((x) => String(x).slice(0, 40));
    }
    const heard = str(src.heard, 40);
    if (heard) out.heard = heard;
    const s = src.shopping as Record<string, unknown> | undefined;
    if (s && typeof s === "object") {
      const lat = typeof s.lat === "number" && Number.isFinite(s.lat) ? s.lat : undefined;
      const lon = typeof s.lon === "number" && Number.isFinite(s.lon) ? s.lon : undefined;
      // The stores the user shops at (bounded, de-duped); tolerate a legacy single `market`.
      const markets = Array.isArray(s.markets)
        ? [...new Set(s.markets.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 120)))].slice(0, 10)
        : [];
      if (!markets.length) {
        const legacy = str(s.market, 120);
        if (legacy) markets.push(legacy);
      }
      out.shopping = {
        postalCode: str(s.postalCode, 10),
        city: str(s.city, 80),
        markets,
        lat,
        lon,
      };
    }
    onboarding = Object.keys(out).length ? out : null;
  }
  try {
    const passwordHash = await hashPassword(password);
    const res = await createAccount({
      name,
      initials: computeInitials(name),
      color: randomColor(),
      email,
      passwordHash,
      lastName,
      age,
      birthdate,
      restrictions,
      onboarding,
      referralCode: typeof body.referralCode === "string" ? body.referralCode.slice(0, 12) : null,
    });
    return NextResponse.json(res); // { member, token, rank, referralCode }
  } catch (err) {
    console.error("POST /api/account failed", err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

// Permanently delete the signed-in account and all of its personal data (App Store Guideline
// 5.1.1(v)). The bearer token identifies the caller, so an account can only delete itself.
export async function DELETE(req: Request) {
  let auth;
  try {
    auth = await requireMember(req);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw err;
  }
  try {
    const ok = await deleteAccount(auth.memberId);
    if (!ok) return NextResponse.json({ error: "not_an_account" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/account failed", err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
