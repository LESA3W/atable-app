import { NextResponse } from "next/server";
import { withMember } from "@/lib/route-helpers";
import { updateMemberColor, updateMemberName, updateMemberPhoto, updateMemberRestrictions, updateMemberShopping } from "@/lib/db";
import { RESTRICTION_IDS } from "@/lib/diets";
import type { ShoppingInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
// A small square avatar (256px JPEG) is well under this; the cap just stops abuse.
const MAX_PHOTO_LEN = 700_000;

function str(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}
function num(v: unknown, lo: number, hi: number): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined;
}
// A bounded, de-duplicated string array (e.g. the chosen store keys).
function strArr(v: unknown, maxLen: number, maxItems: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = str(x, maxLen);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

function sanitizeShopping(v: unknown): ShoppingInfo | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>;
  const markets = strArr(s.markets, 120, 10);
  if (!markets.length) {
    const legacy = str(s.market, 120); // tolerate an old single-store payload
    if (legacy) markets.push(legacy);
  }
  return {
    postalCode: str(s.postalCode, 10) ?? null,
    city: str(s.city, 80) ?? null,
    markets,
    lat: num(s.lat, -90, 90) ?? null,
    lon: num(s.lon, -180, 180) ?? null,
  };
}

// Update the signed-in member's own profile: avatar colour, custom photo, and/or the
// shopping location + chosen Drive/market.
export async function PATCH(req: Request) {
  return withMember(req, async (auth) => {
    let body: { name?: unknown; color?: unknown; photo?: unknown; shopping?: unknown; restrictions?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }

    // Validate first (cheap, no DB) so a bad field is a clean 400.
    let color: string | undefined;
    if (body.color !== undefined) {
      color = typeof body.color === "string" ? body.color.trim() : "";
      if (!HEX_RE.test(color)) return NextResponse.json({ error: "bad_color" }, { status: 400 });
    }

    let name: string | undefined;
    if (body.name !== undefined) {
      name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 40) return NextResponse.json({ error: "bad_name" }, { status: 400 });
    }

    let photo: string | null | undefined;
    if (body.photo !== undefined) {
      if (body.photo === null) {
        photo = null; // clears the custom photo
      } else {
        const p = typeof body.photo === "string" ? body.photo : "";
        if (!p.startsWith("data:image/") || p.length > MAX_PHOTO_LEN) {
          return NextResponse.json({ error: "bad_photo" }, { status: 400 });
        }
        photo = p;
      }
    }

    let shopping: ShoppingInfo | undefined;
    if (body.shopping !== undefined) {
      const s = sanitizeShopping(body.shopping);
      if (!s) return NextResponse.json({ error: "bad_shopping" }, { status: 400 });
      shopping = s;
    }

    // Re-edited diet restrictions: keep only known ids, de-duplicated. An empty array is valid
    // ("no restrictions").
    let restrictions: string[] | undefined;
    if (body.restrictions !== undefined) {
      if (!Array.isArray(body.restrictions)) return NextResponse.json({ error: "bad_restrictions" }, { status: 400 });
      restrictions = [...new Set(body.restrictions.filter((r): r is string => typeof r === "string" && (RESTRICTION_IDS as string[]).includes(r)))];
    }

    if (name === undefined && color === undefined && photo === undefined && shopping === undefined && restrictions === undefined) {
      return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
    }

    try {
      if (name !== undefined) await updateMemberName(auth.memberId, name);
      if (color !== undefined) await updateMemberColor(auth.memberId, color);
      if (photo !== undefined) await updateMemberPhoto(auth.memberId, photo);
      if (shopping !== undefined) await updateMemberShopping(auth.memberId, shopping);
      if (restrictions !== undefined) await updateMemberRestrictions(auth.memberId, restrictions);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("PATCH /api/me failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
