import { NextResponse } from "next/server";
import { isShoppingDone, setShoppingDone } from "@/lib/db";
import { withFamily } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  return withFamily(req, async (auth) => {
    const week = new URL(req.url).searchParams.get("week") ?? "";
    if (!DATE_RE.test(week)) return NextResponse.json({ error: "bad_week" }, { status: 400 });
    try {
      return NextResponse.json({ done: await isShoppingDone(auth.familyId, week) });
    } catch (err) {
      console.error("GET /api/shopping-done failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function POST(req: Request) {
  return withFamily(req, async (auth) => {
    let body: { week?: string; done?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const week = (body.week ?? "").trim();
    if (!DATE_RE.test(week)) return NextResponse.json({ error: "bad_week" }, { status: 400 });
    try {
      await setShoppingDone(auth.familyId, week, body.done !== false);
      return NextResponse.json({ ok: true, done: body.done !== false });
    } catch (err) {
      console.error("POST /api/shopping-done failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
