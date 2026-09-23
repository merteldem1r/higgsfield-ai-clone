import { NextResponse } from "next/server";

import {
  ASPECTS,
  BATCH_MAX,
  BATCH_MIN,
  DEFAULT_ASPECT,
  DEFAULT_MODEL,
  MODELS,
  isAspectId,
  isModelId,
  type AspectId,
  type ModelId,
} from "@/lib/credits";
import { generateImages, type GeneratedImage } from "@/lib/fal";
import { hashClientIp, ipDailyLimit } from "@/lib/ip";
import { createAdminClient, getUserId } from "@/lib/supabase/server";

export const maxDuration = 60;

const BUCKET = "generations";
const MAX_PROMPT_LENGTH = 2000; // matches the generations.prompt check
// Leaves room under maxDuration to fail the generation and refund before the platform kills us.
const FAL_TIMEOUT_MS = 45_000;

type StartErrorCode = "NO_PROFILE" | "GLOBAL_CAP" | "IP_LIMIT" | "INSUFFICIENT_CREDITS";

type StartResult =
  | { ok: true; generation_id: string; credits: number }
  | { ok: false; code: StartErrorCode };

// NO_PROFILE is a valid session whose user has no profiles row (created before the
// signup trigger existed, or the profile was removed). 401 so the client drops the
// session and signs in again, same as UNAUTHENTICATED.
const START_ERRORS: Record<StartErrorCode, { status: number; message: string }> = {
  NO_PROFILE: { status: 401, message: "Your session is no longer valid. Reload to start a new one." },
  GLOBAL_CAP: { status: 503, message: "Demo budget reached for today." },
  IP_LIMIT: { status: 429, message: "Daily image limit reached for your network. Try again tomorrow." },
  INSUFFICIENT_CREDITS: { status: 402, message: "Not enough credits." },
};

type CompleteResult = { ok: true; credits: number } | { ok: false; code: "NOT_PENDING" };

type StoredAsset = { storage_path: string; width: number | null; height: number | null };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

type GenerateInput = { prompt: string; model: ModelId; aspect: AspectId; batch: number };

// Missing settings fall back to the defaults; present-but-invalid ones are rejected rather than coerced.
async function readInput(request: Request): Promise<GenerateInput | { error: string }> {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) return { error: "Body must be a JSON object." };
  const { prompt, model = DEFAULT_MODEL, aspect = DEFAULT_ASPECT, batch = 1 } = body as Record<string, unknown>;

  const trimmed = typeof prompt === "string" ? prompt.trim() : "";
  if (trimmed.length === 0 || trimmed.length > MAX_PROMPT_LENGTH) {
    return { error: `Prompt must be 1–${MAX_PROMPT_LENGTH} characters.` };
  }
  if (!isModelId(model)) return { error: `Model must be one of: ${Object.keys(MODELS).join(", ")}.` };
  if (!isAspectId(aspect)) return { error: `Aspect must be one of: ${Object.keys(ASPECTS).join(", ")}.` };
  if (typeof batch !== "number" || !Number.isInteger(batch) || batch < BATCH_MIN || batch > BATCH_MAX) {
    return { error: `Batch must be an integer from ${BATCH_MIN} to ${BATCH_MAX}.` };
  }
  return { prompt: trimmed, model, aspect, batch };
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return errorResponse(401, "UNAUTHENTICATED", "Sign in to generate.");

  const input = await readInput(request);
  if ("error" in input) return errorResponse(400, "INVALID_INPUT", input.error);
  const { prompt, aspect, batch } = input;

  const model = MODELS[input.model];
  const admin = createAdminClient();

  const { data: started, error: startError } = await admin.rpc("start_generation", {
    p_user_id: userId,
    p_prompt: prompt,
    p_model: input.model,
    p_aspect: aspect,
    p_batch: batch,
    p_cost_credits: model.credits * batch,
    p_est_usd: model.estUsd * batch,
    p_ip_hash: hashClientIp(request),
    p_ip_daily_limit: ipDailyLimit(),
  });
  if (startError) {
    console.error("start_generation failed", startError);
    return errorResponse(500, "INTERNAL", "Couldn't start the generation.");
  }

  const start = started as StartResult;
  if (!start.ok) {
    const { status, message } = START_ERRORS[start.code];
    return errorResponse(status, start.code, message);
  }

  const generationId = start.generation_id;

  try {
    // Dev-only seam for scripts/test-credits.mts. Vercel builds always run with NODE_ENV=production.
    if (process.env.NODE_ENV === "development" && request.headers.get("x-test-fail-fal") === "1") {
      throw new Error("forced fal failure (test)");
    }
    const images = await generateImages(input.model, prompt, aspect, batch, AbortSignal.timeout(FAL_TIMEOUT_MS));
    if (images.length !== batch) {
      throw new Error(`Expected ${batch} image(s), got ${images.length} (safety filter or provider)`);
    }

    const assets = await Promise.all(
      images.map((image, i) => copyToStorage(admin, `${userId}/${generationId}/${i}.jpg`, image)),
    );

    const { data: completed, error: completeError } = await admin.rpc("complete_generation", {
      p_generation_id: generationId,
      p_assets: assets,
    });
    if (completeError) throw completeError;
    const complete = completed as CompleteResult;
    if (!complete.ok) throw new Error(`complete_generation: ${complete.code}`);

    return NextResponse.json({
      generationId,
      credits: complete.credits,
      images: assets.map((asset) => ({
        url: admin.storage.from(BUCKET).getPublicUrl(asset.storage_path).data.publicUrl,
        width: asset.width,
        height: asset.height,
      })),
    });
  } catch (err) {
    console.error("generation failed", generationId, err);
    const { error: failError } = await admin.rpc("fail_generation", {
      p_generation_id: generationId,
      p_error: err instanceof Error ? err.message : String(err),
    });
    if (failError) {
      // Still pending, so start_generation's stale sweep refunds it on the user's next call.
      console.error("fail_generation failed", generationId, failError);
    }
    return errorResponse(502, "PROVIDER_ERROR", "Generation failed. Your credits were refunded.");
  }
}

async function copyToStorage(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
  image: GeneratedImage,
): Promise<StoredAsset> {
  const res = await fetch(image.url);
  if (!res.ok) throw new Error(`Downloading fal output failed: ${res.status}`);
  const bytes = await res.arrayBuffer();

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: image.contentType, upsert: false });
  if (error) throw error;

  return { storage_path: path, width: image.width, height: image.height };
}
