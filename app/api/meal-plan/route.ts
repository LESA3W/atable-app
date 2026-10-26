import { NextResponse } from "next/server";
import { addMealPlanDish, getMealPlan, removeMealPlanDish, setMealGuests, setShoppingDone } from "@/lib/db";
import { withFamily } from "@/lib/route-helpers";
import { mondayOf, ymdOf } from "@/lib/week";
import type { Slot } from "@/lib/types";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLOTS: Slot[] = ["midi", "soir"];

export async function GET(req: Request) {
  return withFamily(req, async (auth) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return NextResponse.json({ error: "bad_range" }, { status: 400 });
    }
    try {
      const plan = await getMealPlan(auth.familyId, from, to);
      return NextResponse.json(plan);
    } catch (err) {
      console.error("GET /api/meal-plan failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function POST(req: Request) {
  return withFamily(req, async (auth) => {
    let body: {
      op?: "add" | "remove" | "guests";
      date?: string;
      slot?: string;
      dishId?: string;
      dishName?: string;
      course?: string;
      diners?: unknown;
      guests?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    const date = body.date ?? "";
    const slot = body.slot as Slot;
    const op = body.op ?? "add";
    if (!DATE_RE.test(date) || !SLOTS.includes(slot)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    if (op === "guests") {
      const guests = typeof body.guests === "number" ? body.guests : 0;
      try {
        await setMealGuests(auth.familyId, date, slot, guests);
        // Changing the head-count re-opens that week's shopping list (portions changed).
        await setShoppingDone(auth.familyId, ymdOf(mondayOf(0, new Date(`${date}T12:00:00`))), false);
        return NextResponse.json({ ok: true });
      } catch (err) {
        console.error("POST /api/meal-plan guests failed", err);
        return NextResponse.json({ error: "db_error" }, { status: 500 });
      }
    }
    if (!body.dishId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    try {
      if (op === "remove") {
        await removeMealPlanDish(auth.familyId, date, slot, body.dishId);
      } else {
        const diners = Array.isArray(body.diners)
          ? [...new Set(body.diners.filter((x): x is string => typeof x === "string" && !!x).map((x) => x.slice(0, 60)))].slice(0, 20)
          : [];
        await addMealPlanDish(
          auth.familyId,
          date,
          slot,
          {
            dishId: body.dishId,
            dishName: body.dishName ?? body.dishId,
            course: body.course ?? "plat",
            diners,
            guests: typeof body.guests === "number" ? body.guests : 0,
          },
          auth.memberId,
        );
        // Planning a meal re-opens that week's shopping list if it had been marked done (otherwise
        // the list would keep showing "Courses faites" and ignore the new meal).
        await setShoppingDone(auth.familyId, ymdOf(mondayOf(0, new Date(`${date}T12:00:00`))), false);
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("POST /api/meal-plan failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
