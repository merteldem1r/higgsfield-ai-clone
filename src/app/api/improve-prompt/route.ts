import { NextResponse } from "next/server";

import { MAX_PROMPT_LENGTH } from "@/lib/credits";
import { improvePrompt } from "@/lib/fal";
import { hashClientIp } from "@/lib/ip";
import { createAdminClient, getUserId } from "@/lib/supabase/server";

export const maxDuration = 20;

const IMPROVER_TIMEOUT_MS = 15_000;
// Free, so the only brake is per network. An LLM call is ~$0.00003, so this caps abuse, not spend.
const IMPROVE_DAILY_LIMIT = 20;

type StartResult = { ok: true; remaining: number } | { ok: false; code: "IP_LIMIT" };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

// Small models sometimes wrap the answer in quotes or a label despite the instructions.
function cleanOutput(raw: string): string {
  let text = raw
    .trim()
    .replace(/^(?:improved\s+|image\s+)?prompt\s*:\s*/i, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > MAX_PROMPT_LENGTH) {
    const cut = text.slice(0, MAX_PROMPT_LENGTH);
    const boundary = Math.max(cut.lastIndexOf(","), cut.lastIndexOf("."));
    text = (boundary > MAX_PROMPT_LENGTH * 0.6 ? cut.slice(0, boundary) : cut).trim();
  }
  return text;
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return errorResponse(401, "UNAUTHENTICATED", "Sign in to improve prompts.");

  const body: unknown = await request.json().catch(() => null);
  const prompt =
    typeof body === "object" && body !== null && typeof (body as { prompt?: unknown }).prompt === "string"
      ? (body as { prompt: string }).prompt.trim()
      : "";
  if (prompt.length === 0 || prompt.length > MAX_PROMPT_LENGTH) {
    return errorResponse(400, "INVALID_INPUT", `Prompt must be 1–${MAX_PROMPT_LENGTH} characters.`);
  }

  const admin = createAdminClient();
  const { data: started, error: startError } = await admin.rpc("start_prompt_improvement", {
    p_user_id: userId,
    p_ip_hash: hashClientIp(request),
    p_daily_limit: IMPROVE_DAILY_LIMIT,
  });
  if (startError) {
    console.error("start_prompt_improvement failed", startError);
    return errorResponse(500, "INTERNAL", "Couldn't improve the prompt.");
  }
  const start = started as StartResult;
  if (!start.ok) {
    return errorResponse(429, "IP_LIMIT", "Daily prompt improvement limit reached for your network. Try again tomorrow.");
  }

  try {
    const improved = cleanOutput(await improvePrompt(prompt, AbortSignal.timeout(IMPROVER_TIMEOUT_MS)));
    if (improved.length === 0) throw new Error("Improver returned an empty prompt");
    return NextResponse.json({ prompt: improved, remaining: start.remaining });
  } catch (err) {
    console.error("prompt improvement failed", err);
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return timedOut
      ? errorResponse(504, "TIMEOUT", "The prompt improver took too long. Try again.")
      : errorResponse(502, "PROVIDER_ERROR", "Couldn't improve the prompt. Try again.");
  }
}
