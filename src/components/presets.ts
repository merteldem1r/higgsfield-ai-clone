import type { MessageKey } from "@/lib/i18n";

// Each tile image in public/presets/ was generated from exactly this subject + style, so clicking
// a tile loads the prompt that made it. The subject comes first so the composer can pre-select it.
// Names are translated; subject and style are the prompt, which stays English.
export type Preset = { id: string; name: MessageKey; subject: string; style: string };

export const PRESETS: Preset[] = [
  {
    id: "cinematic",
    name: "preset.cinematic",
    subject: "a vintage convertible parked on an empty desert highway",
    style: "cinematic film still, anamorphic lens, teal and orange grade, 35mm film grain",
  },
  {
    id: "neon-noir",
    name: "preset.neon-noir",
    subject: "a rain-soaked city street at night",
    style: "neon noir, magenta and cyan neon signs, wet asphalt reflections, drifting fog",
  },
  {
    id: "golden-hour",
    name: "preset.golden-hour",
    subject: "a wheat field with a lone oak tree",
    style: "golden hour, low warm sun, long soft shadows, hazy backlight",
  },
  {
    id: "monochrome",
    name: "preset.monochrome",
    subject: "a spiral staircase seen from directly above",
    style: "black and white photography, high contrast, deep shadows, fine grain",
  },
  {
    id: "pastel-dream",
    name: "preset.pastel-dream",
    subject: "a small house on a floating island among clouds",
    style: "dreamy pastel palette, soft diffused light, airy, whimsical",
  },
  {
    id: "brutalist",
    name: "preset.brutalist",
    subject: "a concrete tower against an overcast sky",
    style: "brutalist architecture, raw concrete, hard geometric shadows, muted tones",
  },
  {
    id: "macro",
    name: "preset.macro",
    subject: "a dewdrop on a fern leaf",
    style: "extreme macro photography, razor-thin depth of field, soft bokeh, crisp detail",
  },
  {
    id: "retro-future",
    name: "preset.retro-future",
    subject: "a chrome diner on a desert planet with two moons",
    style: "retro-futurism, 1970s sci-fi paperback cover, airbrushed, warm grain",
  },
];

export function presetPrompt(preset: Preset): string {
  return `${preset.subject}, ${preset.style}`;
}
