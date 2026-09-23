import { ensureSession, restartSession } from "@/lib/supabase/session";

import type { GenerateRequest, RunImage } from "./types";

export type GenerationOutcome =
  | { ok: true; credits: number; images: RunImage[] }
  | { ok: false; status: number; code: string; message: string };

function post(request: GenerateRequest) {
  return fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

// Throws only on network failure or a failed sign-in; every HTTP error comes back as an outcome.
export async function requestGeneration(request: GenerateRequest): Promise<GenerationOutcome> {
  await ensureSession();
  let res = await post(request);
  if (res.status === 401) {
    // UNAUTHENTICATED or NO_PROFILE: the stored session is dead. Replace it once and retry.
    await restartSession();
    res = await post(request);
  }

  const body = (await res.json().catch(() => null)) as {
    credits?: number;
    images?: RunImage[];
    code?: string;
    message?: string;
  } | null;

  if (res.ok && body && typeof body.credits === "number" && Array.isArray(body.images)) {
    return { ok: true, credits: body.credits, images: body.images };
  }
  return {
    ok: false,
    status: res.status,
    code: body?.code ?? "UNKNOWN",
    message: body?.message ?? `Request failed (${res.status}).`,
  };
}
