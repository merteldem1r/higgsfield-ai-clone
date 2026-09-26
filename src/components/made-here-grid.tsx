"use client";

import Image from "next/image";

import type { AspectId } from "@/lib/credits";

import { ReuseIcon } from "./icons";
import { useT } from "./locale-provider";
import { SHOWCASE } from "./showcase";

// Our own generations with the exact prompt that made each one. Recreate hands the caller the prompt and
// settings; it never generates.
export function MadeHereGrid({
  onRecreate,
  limit,
}: {
  onRecreate: (prompt: string, settings: { aspect: AspectId }) => void;
  limit?: number;
}) {
  const t = useT();
  const items = limit ? SHOWCASE.slice(0, limit) : SHOWCASE;

  return (
    // CSS columns, not grid: exact aspect ratios with no JS; order runs down each column.
    <ul aria-label={t("home.showcaseTitle")} className="columns-2 gap-2 sm:columns-3 lg:columns-4">
      {items.map((item) => (
        <li key={item.src} className="mb-2 break-inside-avoid">
          <div className="group relative overflow-hidden rounded-lg bg-bg-2">
            <Image
              src={item.src}
              alt={item.prompt}
              width={item.width}
              height={item.height}
              sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 50vw"
              className="block h-auto w-full"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 bg-linear-to-t from-black/80 via-black/40 to-transparent p-3 pt-12 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:bg-none pointer-coarse:pt-3 pointer-coarse:opacity-100">
              <p className="line-clamp-3 text-xs leading-4 text-white/90 pointer-coarse:hidden">{item.prompt}</p>
              <button
                type="button"
                onClick={() => onRecreate(item.prompt, { aspect: item.aspect })}
                className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-md bg-white/15 px-3 text-xs font-semibold text-white backdrop-blur-md transition-colors duration-150 hover:bg-white/25"
              >
                <ReuseIcon className="size-3.5" />
                {t("home.recreate")}
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
