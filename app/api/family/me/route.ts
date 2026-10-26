import { NextResponse } from "next/server";
import { getFamilyContext } from "@/lib/db";
import { withMember } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withMember(req, async (auth) => {
    try {
      const ctx = await getFamilyContext(auth.memberId);
      if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json(ctx);
    } catch (err) {
      console.error("GET /api/family/me failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
