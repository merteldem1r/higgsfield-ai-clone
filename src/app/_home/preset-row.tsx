"use client";

import Image from "next/image";

import { useT } from "@/components/locale-provider";

import { useHomeComposer } from "./home-composer";
import { PRESETS, presetPrompt } from "./presets";
import { Reveal } from "./reveal";

export function PresetRow() {
  const { loadPrompt } = useHomeComposer();
  const t = useT();

  return (
    <Reveal
      as="ul"
      className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 xl:mx-0 xl:grid xl:grid-cols-8 xl:overflow-visible xl:px-0"
    >
      {PRESETS.map((preset) => (
        <li key={preset.id} className="w-36 shrink-0 snap-start sm:w-44 xl:w-auto">
          <button
            type="button"
            // Subject pre-selected: typing replaces it and keeps the style.
            onClick={() => loadPrompt(presetPrompt(preset), { select: [0, preset.subject.length] })}
            aria-label={t("preset.use", { name: t(preset.name) })}
            className="group relative block aspect-3/4 w-full overflow-hidden rounded-lg bg-bg-2 text-left"
          >
            <Image
              src={`/presets/${preset.id}.jpg`}
              alt=""
              fill
              sizes="(min-width: 1280px) 12vw, (min-width: 640px) 176px, 144px"
              className="object-cover transition-[scale,translate] duration-300 ease-out motion-safe:group-hover:-translate-y-1.5 motion-safe:group-hover:scale-106 motion-safe:group-focus-visible:-translate-y-1.5 motion-safe:group-focus-visible:scale-106"
            />
            <span className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-white/8 ring-inset transition-shadow duration-150 group-hover:ring-accent/60" />
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-3 pt-12">
              <span className="block font-display text-h3 text-white uppercase">{t(preset.name)}</span>
            </span>
          </button>
        </li>
      ))}
    </Reveal>
  );
}
