import { NextResponse } from "next/server";
import { acceptInvite, createInvite, getMemberByInviteCode, refuseInvite } from "@/lib/db";
import { withMember } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

// op=create : an admin invites an account into their family by that account's personal code.
// op=accept/refuse : the invitee decides on an invite sent to them.
export async function POST(req: Request) {
  return withMember(req, async (auth) => {
    let body: { op?: string; code?: string; id?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const op = body.op;
    try {
      if (op === "create") {
        if (!auth.familyId) return NextResponse.json({ error: "no_family" }, { status: 403 });
        // Any member may invite. Admin approval already guards the OTHER way in — the family code is
        // visible to everyone (app/famille), and a code join lands as a join_request that only an
        // admin can accept (see app/api/join-requests). Gating invites on top of that protected
        // nothing; it just made members hand out the code instead.
        const code = (body.code ?? "").trim();
        if (code.length < 4) return NextResponse.json({ error: "bad_code" }, { status: 400 });
        const invitee = await getMemberByInviteCode(code);
        if (!invitee) return NextResponse.json({ error: "not_found" }, { status: 404 });
        const r = await createInvite(auth.familyId, auth.memberId, invitee.id);
        if (!r.ok) return NextResponse.json({ error: r.reason ?? "failed" }, { status: 409 });
        return NextResponse.json({ ok: true, name: invitee.name });
      }
      if (op === "accept" || op === "refuse") {
        const id = body.id ?? "";
        if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
        if (op === "accept") {
          const ok = await acceptInvite(id, auth.memberId);
          if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
        } else {
          await refuseInvite(id, auth.memberId);
        }
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: "bad_op" }, { status: 400 });
    } catch (err) {
      console.error("POST /api/invites failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
