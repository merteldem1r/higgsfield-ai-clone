import { batchCost, MODELS, type AspectId } from "@/lib/credits";

import type { GenerateRequest, Run } from "./types";

// The assistant's voice. Every line is built from facts we actually have (settings, timing, credits,
// error codes). Nothing here describes image content: nothing looked at the image, so it can't claim to.
// Wording is picked by hashing the run id, so a reload shows the same reply.

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

export function introLine(run: Run): string {
  const req = run.request;
  const model = MODELS[req.model].label;
  const shape = ORIENTATION[req.aspect];
  return pick(
    [
      `On it. Rendering ${takes(req)} at ${req.aspect} with ${model}.`,
      `Got it. ${model} is working on ${takes(req)}, ${shape}.`,
      `Sending this to ${model}: ${takes(req)} at ${req.aspect}.`,
      `Starting now. ${takes(req)[0].toUpperCase()}${takes(req).slice(1)}, ${shape}, on ${model}.`,
      `Let's see it. Rendering ${takes(req)} in ${req.aspect} with ${model}.`,
      `${model} is on it. ${takes(req)[0].toUpperCase()}${takes(req).slice(1)} at ${req.aspect}, coming right up.`,
      `Rendering ${takes(req)} now. ${model}, ${shape} frame.`,
      `Queued on ${model}. ${takes(req)[0].toUpperCase()}${takes(req).slice(1)}, ${req.aspect}.`,
    ],
    `${run.id}:intro`,
  );
}

function seconds(run: Run): string | null {
  if (!run.completedAt) return null;
  return `${Math.max((run.completedAt - run.startedAt) / 1000, 0.1).toFixed(1)}s`;
}

export function outroLine(run: Run): string {
  const req = run.request;
  const model = MODELS[req.model].label;
  const cost = batchCost(req.model, req.batch).credits;
  const time = seconds(run);
  const many = run.images.length > 1;

  if (run.status === "failed") {
    return pick(
      [
        `${model} couldn't finish this one. Your ${cost} credits are back.`,
        `That one failed on the provider's side. I refunded your ${cost} credits.`,
        `Something went wrong while rendering, so nothing was charged. Your ${cost} credits are back.`,
        `No image this time; the render didn't complete. The ${cost} credits went back to your balance.`,
      ],
      `${run.id}:failed`,
    );
  }

  const spent =
    run.creditsLeft === undefined
      ? `That used ${cost} credits.`
      : run.creditsLeft === 0
        ? `That used ${cost} credits, the last of your balance.`
        : `That used ${cost} credits. You have ${run.creditsLeft} left.`;

  const done = pick(
    [
      time ? `Done in ${time}.` : "Done.",
      time ? `${many ? "Here they are" : "Here it is"}, ${time} on ${model}.` : `${many ? "Here they are" : "Here it is"}.`,
      time ? `Finished in ${time}.` : "Finished.",
      time ? `Rendered in ${time}.` : "Rendered.",
      time ? `${many ? "All set" : "Ready"} after ${time}.` : `${many ? "All set" : "Ready"}.`,
    ],
    `${run.id}:done`,
  );
  const nudge = pick(
    [
      "Want to push it further?",
      "Want a variation?",
      "Where should we take it next?",
      "Try a different angle?",
      "Want to change the frame?",
      "Keep going?",
    ],
    `${run.id}:nudge`,
  );
  return `${done} ${spent} ${nudge}`;
}

// Turns the API rejected before spending anything. Worded as the assistant, not as an error dialog.
export function rejectionLine(run: Run): string {
  const code = run.rejection?.code ?? "UNKNOWN";
  const cost = batchCost(run.request.model, run.request.batch).credits;
  switch (code) {
    case "INSUFFICIENT_CREDITS":
      return `This needs ${cost} credits, more than you have left. Sign up to get 50 more; your images stay right here.`;
    case "GLOBAL_CAP":
      return "Today's demo budget is used up, so I can't render more until tomorrow. Everything you've made is still here.";
    case "IP_LIMIT":
      return "Your network has hit today's image limit. Come back tomorrow and we'll pick this up.";
    case "FAL_DISABLED":
      return "Generation is paused right now. Give it a few minutes and try again.";
    case "NETWORK":
      return "I couldn't reach the server. Check your connection and try again.";
    default:
      return `That didn't go through: ${run.rejection?.message ?? "an unknown error."} Nothing was charged.`;
  }
}

export type FollowUp = { label: string; request: GenerateRequest; cost: number };

// Three one-step variations of the last run. Each only loads the composer; nothing generates or spends.
export function followUps(req: GenerateRequest): FollowUp[] {
  const tall = req.aspect === "9:16" || req.aspect === "3:4";
  const variants: { label: string; change: Partial<GenerateRequest> }[] = [
    req.model === "flux-schnell"
      ? { label: "Try it on Flux Dev", change: { model: "flux-dev" } }
      : { label: "Faster on Flux Schnell", change: { model: "flux-schnell" } },
    req.batch === 1 ? { label: "Make 4 takes", change: { batch: 4 } } : { label: "Just one take", change: { batch: 1 } },
    tall ? { label: "Go wide 16:9", change: { aspect: "16:9" } } : { label: "Go vertical 9:16", change: { aspect: "9:16" } },
  ];
  return variants.map(({ label, change }) => {
    const request = { ...req, ...change };
    return { label, request, cost: batchCost(request.model, request.batch).credits };
  });
}
