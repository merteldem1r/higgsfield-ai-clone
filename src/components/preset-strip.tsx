"use client";

import Image from "next/image";

import { useT } from "./locale-provider";
import { PRESETS, presetPrompt } from "./presets";

// Eight styles as a strip. Picking one hands the caller the prompt with the subject range pre-selected,
// so typing replaces the subject and keeps the style.
export function PresetStrip({ onPick }: { onPick: (prompt: string, select: [number, number]) => void }) {
  const t = useT();
  return (
    <ul
      aria-label={t("home.presetsTitle")}
      className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8"
    >
      {PRESETS.map((preset) => (
        <li key={preset.id} className="w-32 shrink-0 snap-start sm:w-auto">
          <button
            type="button"
            onClick={() => onPick(presetPrompt(preset), [0, preset.subject.length])}
            aria-label={t("preset.use", { name: t(preset.name) })}
            className="group relative block aspect-3/4 w-full overflow-hidden rounded-lg bg-bg-2 text-left"
          >
            <Image
              src={`/presets/${preset.id}.jpg`}
              alt=""
              fill
              sizes="(min-width: 1024px) 110px, (min-width: 640px) 25vw, 128px"
              className="object-cover transition-opacity duration-150 group-hover:opacity-80 group-focus-visible:opacity-80"
            />
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent p-2.5 pt-8">
              <span className="block text-sm font-medium text-white">{t(preset.name)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
