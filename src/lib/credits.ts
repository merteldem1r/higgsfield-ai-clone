// Imported by both the composer and /api/generate, so the button and the server can't disagree.

export const MODELS = {
  "flux-schnell": {
    label: "Flux Schnell",
    credits: 2,
    listCredits: 3,
    // fal bills $0.003/MP, rounded up per image. 1024x1024 is just over 1MP, so budget for 2.
    estUsd: 0.006,
  },
} as const;

export type ModelId = keyof typeof MODELS;

export const DEFAULT_MODEL: ModelId = "flux-schnell";
