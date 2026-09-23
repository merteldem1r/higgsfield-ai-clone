import { MODELS } from "@/lib/credits";
import type { MessageKey } from "@/lib/i18n";

// Illustrative pricing for the demo: no checkout exists. The image counts are derived from the real
// per-model costs, so they stay right if a cost changes.
export const ANNUAL_DISCOUNT = 0.3;

export type Plan = {
  id: "starter" | "plus" | "ultra";
  /** Plan names are product names and stay as written in every language. */
  name: string;
  tagline: MessageKey;
  monthlyUsd: number;
  credits: number;
  badge?: "popular" | "best-value";
  features: { label: MessageKey; included: boolean }[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "plan.starter.tagline",
    monthlyUsd: 12,
    credits: 400,
    features: [
      { label: "plan.feature.models", included: true },
      { label: "plan.feature.upTo4", included: true },
      { label: "plan.feature.allAspects", included: true },
      { label: "plan.feature.gallery", included: true },
      { label: "plan.feature.priority", included: false },
      { label: "plan.feature.earlyVideo", included: false },
    ],
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "plan.plus.tagline",
    monthlyUsd: 29,
    credits: 1200,
    badge: "popular",
    features: [
      { label: "plan.feature.everythingStarter", included: true },
      { label: "plan.feature.priority", included: true },
      { label: "plan.feature.earlyVideo", included: true },
      { label: "plan.feature.commercial", included: true },
      { label: "plan.feature.batchPresets", included: false },
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    tagline: "plan.ultra.tagline",
    monthlyUsd: 69,
    credits: 3600,
    badge: "best-value",
    features: [
      { label: "plan.feature.everythingPlus", included: true },
      { label: "plan.feature.fastest", included: true },
      { label: "plan.feature.batchPresets", included: true },
      { label: "plan.feature.lowestCost", included: true },
    ],
  },
];

export function priceFor(plan: Plan, annual: boolean): number {
  return annual ? Math.round(plan.monthlyUsd * (1 - ANNUAL_DISCOUNT)) : plan.monthlyUsd;
}

export function imagesFor(credits: number) {
  return {
    schnell: Math.floor(credits / MODELS["flux-schnell"].credits),
    dev: Math.floor(credits / MODELS["flux-dev"].credits),
  };
}
