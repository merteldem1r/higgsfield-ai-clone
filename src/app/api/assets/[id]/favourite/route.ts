import { NextResponse } from "next/server";

import { createAdminClient, getUserId } from "@/lib/supabase/server";

// Postgres would reject a malformed uuid with an error; answering 404 here keeps it out of the logs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SetFavouriteResult = { ok: true; favourite: boolean } | { ok: false; code: "NOT_FOUND" };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

// POST { favourite: boolean }. Sets rather than toggles, so a repeated request is harmless.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(request);
  if (!userId) return errorResponse(401, "UNAUTHENTICATED", "Sign in to save favourites.");

  const { id } = await params;
  if (!UUID.test(id)) return errorResponse(404, "NOT_FOUND", "Image not found.");

  const body: unknown = await request.json().catch(() => null);
  const favourite = typeof body === "object" && body !== null ? (body as Record<string, unknown>).favourite : undefined;
  if (typeof favourite !== "boolean") return errorResponse(400, "INVALID_INPUT", "favourite must be true or false.");

  const { data, error } = await createAdminClient().rpc("set_favourite", {
    p_user_id: userId,
    p_asset_id: id,
    p_favourite: favourite,
  });
  if (error) {
    console.error("set_favourite failed", id, error);
    return errorResponse(500, "INTERNAL", "Couldn't update favourites.");
  }

  const result = data as SetFavouriteResult;
  // Someone else's asset looks the same as a missing one, so ids can't be probed.
  if (!result.ok) return errorResponse(404, "NOT_FOUND", "Image not found.");
  return NextResponse.json({ favourite: result.favourite });
}
