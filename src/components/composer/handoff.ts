import { BATCH_MAX, BATCH_MIN, isAspectId, isModelId } from "@/lib/credits";

import type { GenerateRequest } from "./types";

// Carries a request from another page to /image. sessionStorage, not the URL: a link must never be able to
// start a paid generation, and taking an entry deletes it, so refresh or back can't replay it.
// Two keys on purpose: a "generation" starts on arrival (Generate on /), a "draft" only fills the composer
// (Reuse on /assets). Keeping them apart means a reuse can never turn into a spend.
const GENERATION_KEY = "pending-generation";
const DRAFT_KEY = "pending-draft";
const MAX_AGE_MS = 30_000;

function stash(key: string, request: GenerateRequest): void {
  sessionStorage.setItem(key, JSON.stringify({ ...request, at: Date.now() }));
}

function take(key: string): GenerateRequest | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
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

export const stashGeneration = (request: GenerateRequest) => stash(GENERATION_KEY, request);
export const takeStashedGeneration = () => take(GENERATION_KEY);

export const stashDraft = (request: GenerateRequest) => stash(DRAFT_KEY, request);
export const takeStashedDraft = () => take(DRAFT_KEY);
