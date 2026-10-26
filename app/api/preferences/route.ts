import { NextResponse } from "next/server";
import { getAllPreferences, setPreference } from "@/lib/db";
import { withFamily } from "@/lib/route-helpers";
import type { Status } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withFamily(req, async (auth) => {
    try {
      const prefs = await getAllPreferences(auth.familyId);
      return NextResponse.json(prefs);
    } catch (err) {
      console.error("GET /api/preferences failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function POST(req: Request) {
  return withFamily(req, async (auth) => {
    let body: { person?: string; foodId?: string; status?: string | null; favorite?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const { person, foodId, status, favorite } = body;
    // A member may edit anyone in their own family (browsing others' tastes); the write
    // is scoped to auth.familyId, so it can't touch another family.
    if (!person) return NextResponse.json({ error: "bad_person" }, { status: 400 });
    if (!foodId) return NextResponse.json({ error: "bad_food" }, { status: 400 });
    if (status !== null && status !== "O" && status !== "M" && status !== "N") {
      return NextResponse.json({ error: "bad_status" }, { status: 400 });
    }
    try {
      await setPreference(auth.familyId, person, foodId, (status ?? null) as Status | null, !!favorite);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("POST /api/preferences failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
