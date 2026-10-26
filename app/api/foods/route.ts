import { NextResponse } from "next/server";
import { addCustomFood, getCustomFoods } from "@/lib/db";
import { withFamily } from "@/lib/route-helpers";
import { CATEGORIES, FOOD_BY_ID } from "@/data/foods";
import type { CustomFood } from "@/lib/types";

export const dynamic = "force-dynamic";

function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function GET(req: Request) {
  return withFamily(req, async (auth) => {
    try {
      const foods = await getCustomFoods(auth.familyId);
      return NextResponse.json(foods);
    } catch (err) {
      console.error("GET /api/foods failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function POST(req: Request) {
  return withFamily(req, async (auth) => {
    let body: { label?: string; category?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const label = (body.label ?? "").trim();
    const category = body.category ?? "";
    if (label.length < 2 || label.length > 60) {
      return NextResponse.json({ error: "bad_label" }, { status: 400 });
    }
    if (!CATEGORIES.some((c) => c.id === category)) {
      return NextResponse.json({ error: "bad_category" }, { status: 400 });
    }
    const base = slugify(label) || "aliment";
    const id = `custom-${base}-${Date.now().toString(36)}`;
    if (FOOD_BY_ID[id]) {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    // author = the current member
    const food: CustomFood = { id, label, category, createdBy: auth.memberId };
    try {
      await addCustomFood(auth.familyId, food);
      return NextResponse.json(food);
    } catch (err) {
      console.error("POST /api/foods failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
