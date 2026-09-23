import { BATCH_MAX, BATCH_MIN, isAspectId, isModelId } from "@/lib/credits";

import type { GenerateRequest } from "./types";

// Carries a Generate click from / to /image. sessionStorage, not the URL: a link must never be able
// to start a paid generation, and taking the entry deletes it, so refresh or back can't re-spend.
const KEY = "pending-generation";
const MAX_AGE_MS = 30_000;

export function stashGeneration(request: GenerateRequest): void {
  sessionStorage.setItem(KEY, JSON.stringify({ ...request, at: Date.now() }));
}

export function takeStashedGeneration(): GenerateRequest | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  const data = JSON.parse(raw) as Partial<GenerateRequest> & { at?: number };
  const fresh = typeof data.at === "number" && Date.now() - data.at < MAX_AGE_MS;
  const valid =
    typeof data.prompt === "string" &&
    data.prompt.trim() !== "" &&
    isModelId(data.model) &&
    isAspectId(data.aspect) &&
    typeof data.batch === "number" &&
    data.batch >= BATCH_MIN &&
    data.batch <= BATCH_MAX;
  if (!fresh || !valid) return null;
  return { prompt: data.prompt!, model: data.model!, aspect: data.aspect!, batch: data.batch! };
}
