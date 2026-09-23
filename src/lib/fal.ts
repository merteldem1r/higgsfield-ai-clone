import "server-only";

import { createFalClient } from "@fal-ai/client";

const fal = createFalClient({ credentials: () => process.env.FAL_KEY });

export type GeneratedImage = {
  url: string;
  width: number | null;
  height: number | null;
  contentType: string;
};

export async function generateSchnell(prompt: string, signal: AbortSignal): Promise<GeneratedImage[]> {
  const { data } = await fal.subscribe("fal-ai/flux/schnell", {
    input: {
      prompt,
      image_size: "square_hd",
      num_images: 1,
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
