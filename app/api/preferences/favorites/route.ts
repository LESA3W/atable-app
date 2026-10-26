import { NextResponse } from "next/server";
import { getFavorites } from "@/lib/db";
import { withFamily } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

// Favorite food ids per person (for the family's members). Read on its own so the main
// /api/preferences GET keeps its plain status-map shape.
export async function GET(req: Request) {
  return withFamily(req, async (auth) => {
    try {
      return NextResponse.json(await getFavorites(auth.familyId));
    } catch (err) {
      console.error("GET /api/preferences/favorites failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
