import { NextResponse } from "next/server";
import { acceptJoinRequest, getPendingJoinRequests, refuseJoinRequest } from "@/lib/db";
import { withFamily } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withFamily(req, async (auth) => {
    if (auth.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    try {
      const list = await getPendingJoinRequests(auth.familyId);
      return NextResponse.json(list);
    } catch (err) {
      console.error("GET /api/join-requests failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}

export async function POST(req: Request) {
  return withFamily(req, async (auth) => {
    if (auth.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    let body: { op?: "accept" | "refuse"; id?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }
    if (!body.id || (body.op !== "accept" && body.op !== "refuse")) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    try {
      if (body.op === "accept") await acceptJoinRequest(body.id, auth.familyId);
      else await refuseJoinRequest(body.id, auth.familyId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("POST /api/join-requests failed", err);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  });
}
