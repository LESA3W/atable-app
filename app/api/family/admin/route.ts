import { NextResponse } from "next/server";
import { withFamily } from "@/lib/route-helpers";
import { setFamilyAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

// Admin names another member (with an account) as admin. transfer=true hands over the
// keys (the caller becomes a plain member); otherwise it just adds a co-admin.
export async function POST(req: Request) {
  return withFamily(req, async (auth) => {
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    let body: { memberId?: string; transfer?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const targetId = (body.memberId ?? "").trim();
    if (!targetId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    if (targetId === auth.memberId) {
      return NextResponse.json({ error: "already_admin" }, { status: 400 });
    }
    try {
      const res = await setFamilyAdmin(auth.familyId, auth.memberId, targetId, !!body.transfer);
      if (!res.ok) {
        const status = res.error === "no_account" ? 400 : 404;
        return NextResponse.json({ error: res.error }, { status });
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("POST /api/family/admin failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
