import { NextResponse } from "next/server";
import { listShoppingOverrides, setShoppingOverride } from "@/lib/db";
import { withFamily } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Per-product overrides on a week's list (custom pack quantity + chosen brand), shared per family.
export async function GET(req: Request) {
  return withFamily(req, async (auth) => {
    const week = new URL(req.url).searchParams.get("week") ?? "";
    if (!DATE_RE.test(week)) return NextResponse.json({ error: "bad_week" }, { status: 400 });
    try {
      return NextResponse.json({ overrides: await listShoppingOverrides(auth.familyId, week) });
    } catch (err) {
      console.error("GET /api/shopping-overrides failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function POST(req: Request) {
  return withFamily(req, async (auth) => {
    let body: { week?: string; itemKey?: unknown; qty?: unknown; brand?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const week = (body.week ?? "").trim();
    const itemKey = typeof body.itemKey === "string" ? body.itemKey.slice(0, 200) : "";
    if (!DATE_RE.test(week) || !itemKey) return NextResponse.json({ error: "bad_input" }, { status: 400 });
    // Only the provided fields are changed; qty is clamped, brand trimmed (null clears it).
    const patch: { qty?: number | null; brand?: string | null } = {};
    if ("qty" in body) patch.qty = body.qty == null ? null : Math.max(1, Math.min(99, Math.floor(Number(body.qty)) || 1));
    if ("brand" in body) patch.brand = body.brand == null ? null : String(body.brand).slice(0, 60) || null;
    try {
      await setShoppingOverride(auth.familyId, week, itemKey, patch);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("POST /api/shopping-overrides failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
