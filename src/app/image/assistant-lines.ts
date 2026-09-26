import { batchCost, MODELS, UPGRADE_BONUS, type AspectId } from "@/lib/credits";
import type { Locale, MessageKey, T } from "@/lib/i18n";

import type { GenerateRequest, Run } from "./types";

// The studio's voice, kept for the moments that need a sentence: a run in progress, a failure, a refund,
// a request the server turned down. Finished runs speak through their facts row instead.
// Every line is built from facts we actually have. Nothing describes image content: nothing looked at it.
// Wording is picked by hashing the run id, so a reload shows the same line.
// The varied wording is English-only; other locales get one translated line per slot.

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pick<T>(options: T[], seed: string): T {
  return options[hash(seed) % options.length];
}

const ORIENTATION: Record<AspectId, string> = {
  "1:1": "square",
  "3:4": "portrait",
  "4:3": "landscape",
  "9:16": "vertical",
  "16:9": "widescreen",
};

function takes({ batch }: GenerateRequest): string {
  return batch === 1 ? "one frame" : `${batch} takes`;
}

function capital(text: string): string {
  return text[0].toUpperCase() + text.slice(1);
}

export function pendingLine(run: Run, locale: Locale, t: T): string {
  const req = run.request;
  const model = MODELS[req.model].label;
  if (locale !== "en") {
    const takesText = req.batch === 1 ? t("assistant.takes.one") : t("assistant.takes.many", { n: req.batch });
    return t("assistant.intro", { takes: takesText, aspect: req.aspect, model });
  }
  const shape = ORIENTATION[req.aspect];
  return pick(
    [
      `Rendering ${takes(req)} at ${req.aspect} with ${model}.`,
      `${model} is working on ${takes(req)}, ${shape}.`,
      `${capital(takes(req))}, ${shape}, on ${model}.`,
      `Rendering ${takes(req)} now. ${model}, ${shape} frame.`,
      `Queued on ${model}. ${capital(takes(req))}, ${req.aspect}.`,
    ],
    `${run.id}:intro`,
  );
}

export function failureLine(run: Run, locale: Locale, t: T): string {
  const req = run.request;
  const model = MODELS[req.model].label;
  const cost = batchCost(req.model, req.batch).credits;
  if (locale !== "en") return t("assistant.failed", { model, cost });
  return pick(
    [
      `${model} couldn't finish this one. Your ${cost} credits are back.`,
      `That one failed on the provider's side. Your ${cost} credits were refunded.`,
      `The render didn't complete, so nothing was charged. Your ${cost} credits are back.`,
      `No image this time. The ${cost} credits went back to your balance.`,
    ],
    `${run.id}:failed`,
  );
}

// A request the API rejected before spending anything. Shown in the composer, next to the way out.
export function rejectionLine(code: string, message: string, request: GenerateRequest, locale: Locale, t: T, member = false): string {
  const cost = batchCost(request.model, request.batch).credits;
  switch (code) {
    case "INSUFFICIENT_CREDITS":
      return member
        ? t("assistant.reject.creditsMember", { cost })
        : t("assistant.reject.creditsGuest", { cost, bonus: UPGRADE_BONUS });
    case "GLOBAL_CAP":
      return t("assistant.reject.globalCap");
    case "IP_LIMIT":
      return t("assistant.reject.ipLimit");
    case "FAL_DISABLED":
      return t("assistant.reject.paused");
    case "NETWORK":
      return t("assistant.reject.network");
    default:
      return t("assistant.reject.unknown", { message: fallbackMessage(code, message, locale, t) });
  }
}

// The API's messages are English (it's curl-tested as is), so other locales get a translated stand-in by code.
function fallbackMessage(code: string, message: string, locale: Locale, t: T): string {
  if (locale === "en" && message) return message;
  if (code === "UNAUTHENTICATED" || code === "NO_PROFILE") return t("assistant.err.session");
  if (code === "INVALID_INPUT") return t("assistant.err.invalid");
  if (code === "INTERNAL" || code === "NOT_PENDING") return t("assistant.err.internal");
  return t("assistant.reject.unknownMessage");
}

export type FollowUp = { label: string; request: GenerateRequest; cost: number };

// Three one-step variations of a run. Each only loads the composer; nothing generates or spends.
export function followUps(req: GenerateRequest, t: T): FollowUp[] {
  const tall = req.aspect === "9:16" || req.aspect === "3:4";
  const variants: { key: MessageKey; change: Partial<GenerateRequest> }[] = [
    req.model === "flux-schnell"
      ? { key: "assistant.follow.tryOn", change: { model: "flux-dev" } }
      : { key: "assistant.follow.fasterOn", change: { model: "flux-schnell" } },
    req.batch === 1 ? { key: "assistant.follow.four", change: { batch: 4 } } : { key: "assistant.follow.one", change: { batch: 1 } },
    tall ? { key: "assistant.follow.wide", change: { aspect: "16:9" } } : { key: "assistant.follow.vertical", change: { aspect: "9:16" } },
  ];
  return variants.map(({ key, change }) => {
    const request = { ...req, ...change };
    const label = t(key, { model: MODELS[request.model].label });
    return { label, request, cost: batchCost(request.model, request.batch).credits };
  });
}
