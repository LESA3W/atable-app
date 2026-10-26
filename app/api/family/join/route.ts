import { NextResponse } from "next/server";
import { getFamilyByCode, isFamilyMember, requestJoin } from "@/lib/db";
import { withMember } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

// A signed-in account asks to join a Famille/groupe by its code. An account can belong to several,
// so the only block is trying to join one it's already in. Admins get notified; the requester polls
// GET /api/family/me until it appears (or switches to it from the settings switcher).
export async function POST(req: Request) {
  return withMember(req, async (auth) => {
    let body: { code?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const code = (body.code ?? "").trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const fam = await getFamilyByCode(code);
    if (!fam) return NextResponse.json({ error: "no_family" }, { status: 404 });
    if (await isFamilyMember(auth.memberId, fam.id)) {
      return NextResponse.json({ error: "already_member" }, { status: 409 });
    }
    try {
      await requestJoin(auth.memberId, fam.id);
      return NextResponse.json({ status: "pending", familyName: fam.name });
    } catch (err) {
      console.error("POST /api/family/join failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
