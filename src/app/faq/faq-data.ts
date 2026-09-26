import { FREE_CREDITS, MODELS, UPGRADE_BONUS } from "@/lib/credits";
import type { MessageKey } from "@/lib/i18n";

// Every answer describes how the demo really behaves, built from the credit constants so it stays right.
const schnell = MODELS["flux-schnell"];
const dev = MODELS["flux-dev"];

export const FAQ_PARAMS = {
  schnell: schnell.label,
  schnellCost: schnell.credits,
  schnellSeconds: schnell.estSeconds,
  dev: dev.label,
  devCost: dev.credits,
  devSeconds: dev.estSeconds,
  free: FREE_CREDITS,
  bonus: UPGRADE_BONUS,
  schnellCount: Math.floor(FREE_CREDITS / schnell.credits),
  devCount: Math.floor(FREE_CREDITS / dev.credits),
};

export type FaqGroup = { id: string; title: MessageKey; items: { q: MessageKey; a: MessageKey }[] };

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "start",
    title: "faq.group.start",
    items: [
      { q: "faq.free.q", a: "faq.free.a" },
      { q: "faq.make.q", a: "faq.make.a" },
      { q: "faq.models.q", a: "faq.models.a" },
      { q: "faq.improve.q", a: "faq.improve.a" },
    ],
  },
  {
    id: "credits",
    title: "faq.group.credits",
    items: [
      { q: "faq.credits.q", a: "faq.credits.a" },
      { q: "faq.failed.q", a: "faq.failed.a" },
      { q: "faq.limit.q", a: "faq.limit.a" },
      { q: "faq.buy.q", a: "faq.buy.a" },
    ],
  },
  {
    id: "images",
    title: "faq.group.images",
    items: [
      { q: "faq.gallery.q", a: "faq.gallery.a" },
      { q: "faq.reuse.q", a: "faq.reuse.a" },
      { q: "faq.community.q", a: "faq.community.a" },
      { q: "faq.presets.q", a: "faq.presets.a" },
    ],
  },
  {
    id: "account",
    title: "faq.group.account",
    items: [
      { q: "faq.signup.q", a: "faq.signup.a" },
      { q: "faq.privacy.q", a: "faq.privacy.a" },
    ],
  },
];

// The money questions the pricing page keeps.
export const PRICING_FAQ = FAQ_GROUPS[1].items.filter((item) => item.q !== "faq.limit.q");
