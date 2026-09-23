import "server-only";

import { createFalClient } from "@fal-ai/client";

import { ASPECTS, type AspectId, type ModelId } from "@/lib/credits";

const fal = createFalClient({ credentials: () => process.env.FAL_KEY });

const ENDPOINTS = {
  "flux-schnell": "fal-ai/flux/schnell",
  "flux-dev": "fal-ai/flux/dev",
} as const satisfies Record<ModelId, string>;

export type GeneratedImage = {
  url: string;
  width: number | null;
  height: number | null;
  contentType: string;
};

export async function generateImages(
  model: ModelId,
  prompt: string,
  aspect: AspectId,
  batch: number,
  signal: AbortSignal,
): Promise<GeneratedImage[]> {
  const { data } = await fal.subscribe(ENDPOINTS[model], {
    input: {
      prompt,
      image_size: ASPECTS[aspect].falSize,
      num_images: batch,
      output_format: "jpeg",
      enable_safety_checker: true,
    },
    abortSignal: signal,
  });

  // Flagged images come back blacked out rather than as an error, so drop them here.
  return data.images
    .filter((_, i) => !data.has_nsfw_concepts[i])
    .map((image) => ({
      url: image.url,
      width: image.width ?? null,
      height: image.height ?? null,
      contentType: image.content_type ?? "image/jpeg",
    }));
}
