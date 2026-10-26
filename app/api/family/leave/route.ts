import { NextResponse } from "next/server";
import { removeMember } from "@/lib/db";
import { withMember } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

// Leave one of your Famille/groupe (removes just this membership; you keep your account + the others).
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
      const ok = await removeMember(familyId, auth.memberId);
      if (!ok) return NextResponse.json({ error: "not_a_member" }, { status: 403 });
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("POST /api/family/leave failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
