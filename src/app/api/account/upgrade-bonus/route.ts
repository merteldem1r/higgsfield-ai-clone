import { NextResponse } from "next/server";

import { createAdminClient, getUserId } from "@/lib/supabase/server";

type GrantResult =
  | { ok: true; granted: boolean; credits: number }
  | { ok: false; code: "NOT_UPGRADED" | "NO_PROFILE" };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

// POST, no body. Safe to call any number of times: grant_upgrade_bonus pays out once per user, ever,
// and checks auth.users itself that the account really has a confirmed email.
export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return errorResponse(401, "UNAUTHENTICATED", "Sign in first.");

  const { data, error } = await createAdminClient().rpc("grant_upgrade_bonus", { p_user_id: userId });
  if (error) {
    console.error("grant_upgrade_bonus failed", error);
    return errorResponse(500, "INTERNAL", "Couldn't add your bonus credits.");
  }

  const result = data as GrantResult;
  if (!result.ok) {
    return result.code === "NO_PROFILE"
      ? errorResponse(401, "NO_PROFILE", "Your session is no longer valid.")
      : errorResponse(409, "NOT_UPGRADED", "Add an email and password first.");
  }
  return NextResponse.json({ granted: result.granted, credits: result.credits });
}
