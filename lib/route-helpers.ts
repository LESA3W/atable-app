import { NextResponse } from "next/server";
import { AuthError, requireMember } from "@/lib/db";
import type { Auth } from "@/lib/types";

// Wrap a route handler so it only runs for an authenticated member; returns 401
// otherwise. The handler receives the derived {familyId, memberId, role}.
export async function withMember(
  req: Request,
  handler: (auth: Auth) => Promise<Response>,
): Promise<Response> {
  let auth: Auth;
  try {
    auth = await requireMember(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("auth check failed", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  return handler(auth);
}

// Like withMember, but 403s if the account has no family yet (narrows familyId to string).
export async function withFamily(
  req: Request,
  handler: (auth: Auth & { familyId: string }) => Promise<Response>,
): Promise<Response> {
  return withMember(req, async (auth) => {
    if (!auth.familyId) {
      return NextResponse.json({ error: "no_family" }, { status: 403 });
    }
    return handler({ ...auth, familyId: auth.familyId });
  });
}
