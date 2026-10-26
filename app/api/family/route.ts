import { NextResponse } from "next/server";
import { assignFamilyToMember } from "@/lib/db";
import { withMember } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

// Create a Famille/groupe for the signed-in account (which becomes its admin). An account can
// belong to several at once, so this ADDS one and makes it active (no "already in a family" block).
export async function POST(req: Request) {
  return withMember(req, async (auth) => {
    let body: { familyName?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const familyName = (body.familyName ?? "").trim() || "Ma famille";
    try {
      const family = await assignFamilyToMember(auth.memberId, familyName);
      return NextResponse.json({ family });
    } catch (err) {
      console.error("POST /api/family failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
