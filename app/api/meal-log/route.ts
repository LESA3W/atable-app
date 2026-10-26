import { NextResponse } from "next/server";
import { addMealLog, getMealLog } from "@/lib/db";
import { withFamily } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withFamily(req, async (auth) => {
    try {
      const log = await getMealLog(auth.familyId, 100);
      return NextResponse.json(log);
    } catch (err) {
      console.error("GET /api/meal-log failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function POST(req: Request) {
  return withFamily(req, async (auth) => {
    let body: { dishId?: string; dishName?: string; course?: string; diners?: string[] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const dishId = (body.dishId ?? "").trim();
    const dishName = (body.dishName ?? "").trim();
    const course = body.course ?? "plat";
    const diners = Array.isArray(body.diners) ? body.diners.filter((d) => typeof d === "string") : [];
    if (!dishId || !dishName) {
      return NextResponse.json({ error: "bad_dish" }, { status: 400 });
    }
    try {
      await addMealLog(auth.familyId, { dishId, dishName, course, diners });
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("POST /api/meal-log failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
