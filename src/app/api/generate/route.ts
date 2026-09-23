import { NextResponse } from "next/server";

import { DEFAULT_MODEL, MODELS } from "@/lib/credits";
import { generateSchnell, type GeneratedImage } from "@/lib/fal";
import { createAdminClient, getUserId } from "@/lib/supabase/server";

export const maxDuration = 60;

const BUCKET = "generations";
const MAX_PROMPT_LENGTH = 2000; // matches the generations.prompt check
// Leaves room under maxDuration to fail the generation and refund before the platform kills us.
const FAL_TIMEOUT_MS = 45_000;

type StartResult =
  | { ok: true; generation_id: string; credits: number }
  | { ok: false; code: "INSUFFICIENT_CREDITS" | "GLOBAL_CAP" };

type CompleteResult = { ok: true; credits: number } | { ok: false; code: "NOT_PENDING" };

type StoredAsset = { storage_path: string; width: number | null; height: number | null };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

async function readPrompt(request: Request): Promise<string | null> {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || !("prompt" in body)) return null;
  const { prompt } = body;
  if (typeof prompt !== "string") return null;
  const trimmed = prompt.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_PROMPT_LENGTH ? trimmed : null;
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return errorResponse(401, "UNAUTHENTICATED", "Sign in to generate.");

  const prompt = await readPrompt(request);
  if (!prompt) {
    return errorResponse(400, "INVALID_PROMPT", `Prompt must be 1–${MAX_PROMPT_LENGTH} characters.`);
  }

  const model = MODELS[DEFAULT_MODEL];
  const batch = 1;
  const admin = createAdminClient();

  const { data: started, error: startError } = await admin.rpc("start_generation", {
    p_user_id: userId,
    p_prompt: prompt,
    p_model: DEFAULT_MODEL,
    p_aspect: "1:1",
    p_batch: batch,
    p_cost_credits: model.credits * batch,
    p_est_usd: model.estUsd * batch,
  });
  if (startError) {
    console.error("start_generation failed", startError);
    return errorResponse(500, "INTERNAL", "Couldn't start the generation.");
  }

  const start = started as StartResult;
  if (!start.ok) {
    return start.code === "INSUFFICIENT_CREDITS"
      ? errorResponse(402, "INSUFFICIENT_CREDITS", "Not enough credits.")
      : errorResponse(503, "GLOBAL_CAP", "Demo budget reached for today.");
  }

  const generationId = start.generation_id;

  try {
    const images = await generateSchnell(prompt, AbortSignal.timeout(FAL_TIMEOUT_MS));
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
