"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { stashDraft } from "@/components/composer/handoff";
import { ReuseIcon } from "@/components/icons";
import { Lightbox } from "@/components/lightbox";
import { ASPECTS, DEFAULT_ASPECT, DEFAULT_MODEL, isModelId, type AspectId } from "@/lib/credits";

import type { CommunityItem } from "./feed";

// The feed doesn't send the aspect, so Recreate reads it off the loaded image: the closest ratio we offer.
function nearestAspect(width: number, height: number): AspectId {
  const ratio = width / height;
  let best = DEFAULT_ASPECT;
  for (const [id, size] of Object.entries(ASPECTS) as [AspectId, (typeof ASPECTS)[AspectId]][]) {
    if (Math.abs(size.width / size.height - ratio) < Math.abs(ASPECTS[best].width / ASPECTS[best].height - ratio)) {
      best = id;
    }
  }
  return best;
}

export function CommunityGrid({ items }: { items: CommunityItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<CommunityItem | null>(null);

  function recreate(item: CommunityItem, aspect: AspectId) {
    // A draft only fills the composer on /image; it never starts a generation.
    stashDraft({ prompt: item.prompt, model: isModelId(item.model) ? item.model : DEFAULT_MODEL, aspect, batch: 1 });
    router.push("/image");
  }

  return (
    <>
      {/* CSS columns, not grid: exact aspect ratios with no JS; order runs down each column. */}
      <ul aria-label="Community images" className="columns-2 gap-1.5 sm:columns-3 lg:columns-4 xl:columns-5">
        {items.map((item) => (
          <CommunityTile
            key={item.url}
            item={item}
            onOpen={() => setOpen(item)}
            onRecreate={(aspect) => recreate(item, aspect)}
          />
        ))}
      </ul>
      <Lightbox item={open && { image: open, prompt: open.prompt }} onClose={() => setOpen(null)} />
    </>
  );
}

function CommunityTile({
  item,
  onOpen,
  onRecreate,
}: {
  item: CommunityItem;
  onOpen: () => void;
  onRecreate: (aspect: AspectId) => void;
}) {
  const [aspect, setAspect] = useState<AspectId | null>(null);

  return (
    <li className="mb-1.5 break-inside-avoid">
      <div className={`group relative overflow-hidden rounded-lg bg-bg-2 ${aspect ? "" : "aspect-square"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- final JPEG in public Storage; the optimizer would only re-encode it */}
        <img
          src={item.url}
          alt={item.prompt}
          loading="lazy"
          onLoad={(e) => setAspect(nearestAspect(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight))}
          className={`block h-auto w-full transition-[scale,opacity] duration-300 ease-out motion-safe:group-focus-within:scale-102 motion-safe:group-hover:scale-102 ${
            aspect ? "opacity-100" : "opacity-0"
          }`}
        />
        <button type="button" onClick={onOpen} aria-label="Open image" className="absolute inset-0 cursor-zoom-in" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-2.5 bg-linear-to-t from-black/85 via-black/45 to-transparent p-3 pt-14 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:bg-none pointer-coarse:pt-3 pointer-coarse:opacity-100">
          <div className="flex translate-y-2 flex-col gap-1 transition-[translate] duration-150 group-focus-within:translate-y-0 group-hover:translate-y-0 motion-reduce:translate-y-0 pointer-coarse:hidden">
            <p className="line-clamp-3 text-xs leading-4 text-white/90">{item.prompt}</p>
            <p className="text-xs font-medium text-white/60">@{item.handle}</p>
          </div>
          <button
            type="button"
            onClick={() => onRecreate(aspect ?? DEFAULT_ASPECT)}
            className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-md bg-white/15 px-3 text-xs font-semibold text-white backdrop-blur-md transition-colors duration-150 hover:bg-white/25"
          >
            <ReuseIcon className="size-3.5" />
            Recreate
          </button>
        </div>
      </div>
    </li>
  );
}
