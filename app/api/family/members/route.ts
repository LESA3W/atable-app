import { NextResponse } from "next/server";
import { withFamily } from "@/lib/route-helpers";
import { addManagedMember, removeMember } from "@/lib/db";

export const dynamic = "force-dynamic";

// Admin-only family management: add a managed member (no login) or remove a member.
export async function POST(req: Request) {
  return withFamily(req, async (auth) => {
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = (await req.json().catch(() => ({}))) as { name?: string; isChild?: boolean };
    const name = (body.name ?? "").trim();
    if (name.length < 1 || name.length > 40) {
      return NextResponse.json({ error: "bad_name" }, { status: 400 });
    }
    const member = await addManagedMember(auth.familyId, name, !!body.isChild);
    return NextResponse.json({ member });
  });
}

export async function DELETE(req: Request) {
  return withFamily(req, async (auth) => {
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    if (id === auth.memberId) {
      return NextResponse.json({ error: "cannot_remove_self" }, { status: 400 });
    }
    const ok = await removeMember(auth.familyId, id);
    return NextResponse.json({ ok });
  });
}
