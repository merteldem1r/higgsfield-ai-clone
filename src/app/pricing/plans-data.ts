import { MODELS } from "@/lib/credits";

// Illustrative pricing for the demo: no checkout exists. The image counts are derived from the real
// per-model costs, so they stay right if a cost changes.
export const ANNUAL_DISCOUNT = 0.3;

export type Plan = {
  id: "starter" | "plus" | "ultra";
  name: string;
  tagline: string;
  monthlyUsd: number;
  credits: number;
  badge?: "popular" | "best-value";
  features: { label: string; included: boolean }[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For trying ideas every week",
    monthlyUsd: 12,
    credits: 400,
    features: [
      { label: "Flux Schnell and Flux Dev", included: true },
      { label: "Up to 4 images per prompt", included: true },
      { label: "All five aspect ratios", included: true },
      { label: "Private gallery and downloads", included: true },
      { label: "Priority queue", included: false },
      { label: "Early access to video", included: false },
    ],
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "For creating most days",
    monthlyUsd: 29,
    credits: 1200,
    badge: "popular",
    features: [
      { label: "Everything in Starter", included: true },
      { label: "Priority queue", included: true },
      { label: "Early access to video", included: true },
      { label: "Commercial use", included: true },
      { label: "Batch presets", included: false },
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    tagline: "For studios and heavy use",
    monthlyUsd: 69,
    credits: 3600,
    badge: "best-value",
    features: [
      { label: "Everything in Plus", included: true },
      { label: "Fastest queue", included: true },
      { label: "Batch presets", included: true },
      { label: "Lowest cost per image", included: true },
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
