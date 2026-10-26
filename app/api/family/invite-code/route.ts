import { NextResponse } from "next/server";
import { getMyInviteCode } from "@/lib/db";
import { withMember } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

// The current account's personal invite code (generated on first read) — shown in the family hub so
// others can invite this account.
export async function GET(req: Request) {
  return withMember(req, async (auth) => {
    try {
      const code = await getMyInviteCode(auth.memberId);
      return NextResponse.json({ code });
    } catch (err) {
      console.error("GET /api/family/invite-code failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
