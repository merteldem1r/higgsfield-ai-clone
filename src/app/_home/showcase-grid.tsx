"use client";

import Image from "next/image";

import { ReuseIcon } from "@/components/icons";
import { useT } from "@/components/locale-provider";

import { useHomeComposer } from "./home-composer";
import { Reveal } from "./reveal";
import { SHOWCASE } from "./showcase";

export function ShowcaseGrid() {
  const t = useT();
  const { loadPrompt } = useHomeComposer();

  return (
    // CSS columns, not grid: exact aspect ratios with no JS; order runs down each column.
    <Reveal as="ul" className="columns-2 gap-1.5 sm:columns-3 lg:columns-4 xl:columns-5">
      {SHOWCASE.map((item) => (
        <li key={item.src} className="mb-1.5 break-inside-avoid">
          <div className="group relative overflow-hidden rounded-lg bg-bg-2">
            <Image
              src={item.src}
              alt={item.prompt}
              width={item.width}
              height={item.height}
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="block h-auto w-full transition-[scale] duration-150 ease-out motion-safe:group-focus-within:scale-102 motion-safe:group-hover:scale-102"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-2.5 bg-linear-to-t from-black/85 via-black/45 to-transparent p-3 pt-14 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:bg-none pointer-coarse:pt-3 pointer-coarse:opacity-100">
              <p className="line-clamp-3 translate-y-2 text-xs leading-4 text-white/90 transition-[translate] duration-150 group-focus-within:translate-y-0 group-hover:translate-y-0 motion-reduce:translate-y-0 pointer-coarse:hidden">
                {item.prompt}
              </p>
              <button
                type="button"
                onClick={() => loadPrompt(item.prompt, { settings: { model: "flux-dev", aspect: item.aspect, batch: 1 } })}
                className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-md bg-white/15 px-3 text-xs font-semibold text-white backdrop-blur-md transition-colors duration-150 hover:bg-white/25"
              >
                <ReuseIcon className="size-3.5" />
                {t("home.recreate")}
              </button>
            </div>
          </div>
        </li>
      ))}
    </Reveal>
  );
}
