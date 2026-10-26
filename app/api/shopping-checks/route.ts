import { NextResponse } from "next/server";
import { listShoppingChecks, setShoppingCheck } from "@/lib/db";
import { withFamily } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Which estimated products the family has ticked off this week — shared across members.
export async function GET(req: Request) {
  return withFamily(req, async (auth) => {
    const week = new URL(req.url).searchParams.get("week") ?? "";
    if (!DATE_RE.test(week)) return NextResponse.json({ error: "bad_week" }, { status: 400 });
    try {
      return NextResponse.json({ checked: await listShoppingChecks(auth.familyId, week) });
    } catch (err) {
      console.error("GET /api/shopping-checks failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function POST(req: Request) {
  return withFamily(req, async (auth) => {
    let body: { week?: string; foodId?: unknown; checked?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const week = (body.week ?? "").trim();
    const foodId = typeof body.foodId === "string" ? body.foodId.slice(0, 120) : "";
    if (!DATE_RE.test(week) || !foodId) return NextResponse.json({ error: "bad_input" }, { status: 400 });
    try {
      await setShoppingCheck(auth.familyId, week, foodId, body.checked !== false);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("POST /api/shopping-checks failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
