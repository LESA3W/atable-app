import { NextResponse } from "next/server";
import { switchActiveFamily } from "@/lib/db";
import { withMember } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

// Switch which Famille/groupe the signed-in account is currently viewing. Only works for a
// famille/groupe the account actually belongs to.
export async function POST(req: Request) {
  return withMember(req, async (auth) => {
    let body: { familyId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const familyId = (body.familyId ?? "").trim();
    if (!familyId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    try {
      const ok = await switchActiveFamily(auth.memberId, familyId);
      if (!ok) return NextResponse.json({ error: "not_a_member" }, { status: 403 });
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("POST /api/family/switch failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
