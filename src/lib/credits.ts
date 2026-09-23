// Imported by both the composer and /api/generate, so the button and the server can't disagree.

// Must match v_signup_credits in the handle_new_user trigger. Shown in the pill before a session exists.
export const FREE_CREDITS = 6;

// Must match v_bonus in grant_upgrade_bonus. Granted once, when a guest adds an email + password.
export const UPGRADE_BONUS = 20;

export const MODELS = {
  "flux-schnell": {
    label: "Flux Schnell",
    description: "Fast drafts, about 2 seconds",
    // Typical wall time per request incl. the Storage copy; drives the pending tile's estimate only.
    estSeconds: 3,
    credits: 2,
    listCredits: 3,
    // fal bills $0.003/MP, rounded up per image. 1024x1024 is just over 1MP, so budget for 2.
    estUsd: 0.006,
  },
  "flux-dev": {
    label: "Flux Dev",
    description: "Richer detail and lighting",
    estSeconds: 9,
    credits: 6,
    listCredits: 8,
    // $0.025/MP, rounded up per image; same 2MP worst case as above (square_hd).
    estUsd: 0.05,
  },
} as const;

export type ModelId = keyof typeof MODELS;

export const DEFAULT_MODEL: ModelId = "flux-schnell";

export const ASPECTS = {
  "1:1": { falSize: "square_hd", width: 1024, height: 1024 },
  "3:4": { falSize: "portrait_4_3", width: 768, height: 1024 },
  "4:3": { falSize: "landscape_4_3", width: 1024, height: 768 },
  "9:16": { falSize: "portrait_16_9", width: 576, height: 1024 },
  "16:9": { falSize: "landscape_16_9", width: 1024, height: 576 },
} as const;

export type AspectId = keyof typeof ASPECTS;

// 16:9, not 1:1: square_hd is just over 1MP, which fal bills as 2MP (double) on both models.
export const DEFAULT_ASPECT: AspectId = "16:9";

// Enforced by the composer and /api/generate alike. The generations.prompt check allows 2000 as a backstop.
export const MAX_PROMPT_LENGTH = 500;

export const BATCH_MIN = 1;
export const BATCH_MAX = 4;

export function isModelId(value: unknown): value is ModelId {
  return typeof value === "string" && Object.hasOwn(MODELS, value);
}

export function isAspectId(value: unknown): value is AspectId {
  return typeof value === "string" && Object.hasOwn(ASPECTS, value);
}

export function batchCost(model: ModelId, batch: number) {
  return { credits: MODELS[model].credits * batch, listCredits: MODELS[model].listCredits * batch };
}
