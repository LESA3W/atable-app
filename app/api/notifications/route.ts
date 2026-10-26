import { NextResponse } from "next/server";
import { getNotifications, markNotificationsRead } from "@/lib/db";
import { withMember } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withMember(req, async (auth) => {
    try {
      return NextResponse.json(await getNotifications(auth.memberId));
    } catch (err) {
      console.error("GET /api/notifications failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function POST(req: Request) {
  return withMember(req, async (auth) => {
    let body: { op?: string; id?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    try {
      await markNotificationsRead(auth.memberId, body.id);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("POST /api/notifications failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
