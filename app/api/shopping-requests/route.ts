import { NextResponse } from "next/server";
import { addShoppingRequest, listShoppingRequests, removeShoppingRequest, setRequestChecked } from "@/lib/db";
import { withFamily } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

// Products any family member manually adds to the shopping list ("Les produits demandés").
export async function GET(req: Request) {
  return withFamily(req, async (auth) => {
    try {
      return NextResponse.json({ requests: await listShoppingRequests(auth.familyId) });
    } catch (err) {
      console.error("GET /api/shopping-requests failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function POST(req: Request) {
  return withFamily(req, async (auth) => {
    let body: { label?: unknown; brand?: unknown; qty?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 80) : "";
    if (!label) return NextResponse.json({ error: "empty_label" }, { status: 400 });
    const brand = typeof body.brand === "string" && body.brand.trim() ? body.brand.trim().slice(0, 60) : null;
    const qty = Number(body.qty);
    try {
      const request = await addShoppingRequest(auth.familyId, auth.memberId, label, brand, Number.isFinite(qty) ? qty : 1);
      return NextResponse.json({ request });
    } catch (err) {
      console.error("POST /api/shopping-requests failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function PATCH(req: Request) {
  return withFamily(req, async (auth) => {
    let body: { id?: unknown; checked?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    try {
      await setRequestChecked(auth.familyId, id, body.checked !== false);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("PATCH /api/shopping-requests failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function DELETE(req: Request) {
  return withFamily(req, async (auth) => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    try {
      await removeShoppingRequest(auth.familyId, id);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/shopping-requests failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
