"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

import { ExpandIcon } from "@/components/icons";
import { useT } from "@/components/locale-provider";
import { DEFAULT_ASPECT, nearestAspect, type AspectId } from "@/lib/credits";
import { MAX_PICKS } from "@/lib/look";

import type { Pick, PoolItem } from "./types";

// Round-robin columns, as on /community: every column is used and the order reads across the top row. One
// layout per breakpoint, toggled by CSS; the hidden copy is display:none, so its lazy images never load.
const LAYOUTS = [
  { columns: 2, className: "flex sm:hidden" },
  { columns: 3, className: "hidden sm:flex" },
];

export function PickGrid({
  items,
  picks,
  onToggle,
  onOpen,
}: {
  items: PoolItem[];
  picks: Pick[];
  onToggle: (item: PoolItem, aspect: AspectId) => void;
  onOpen: (item: PoolItem) => void;
}) {
  const t = useT();
  const full = picks.length >= MAX_PICKS;

  return LAYOUTS.map(({ columns, className }) => (
    <div key={columns} className={`${className} items-start gap-1.5`}>
      {Array.from({ length: columns }, (_, column) => (
        <ul key={column} aria-label={t("prompter.column", { n: column + 1 })} className="flex min-w-0 flex-1 flex-col gap-1.5">
          {items
            .filter((_, i) => i % columns === column)
            .map((item) => {
              const index = picks.findIndex((pick) => pick.item.id === item.id);
              return (
                <PickTile
                  key={item.id}
                  item={item}
                  number={index === -1 ? null : index + 1}
                  locked={full && index === -1}
                  onToggle={(aspect) => onToggle(item, aspect)}
                  onOpen={() => onOpen(item)}
                />
              );
            })}
        </ul>
      ))}
    </div>
  ));
}

function PickTile({
  item,
  number,
  locked,
  onToggle,
  onOpen,
}: {
  item: PoolItem;
  /** Its place in the picks, or null when it isn't picked. */
  number: number | null;
  /** Three are picked and this isn't one of them. */
  locked: boolean;
  onToggle: (aspect: AspectId) => void;
  onOpen: () => void;
}) {
  const t = useT();
  const [measured, setMeasured] = useState<AspectId | null>(null);
  const aspect = item.size ? nearestAspect(item.size.width, item.size.height) : measured;
  const picked = number !== null;
  // Featured images come without a size. As on /community, a cached image can finish loading before hydration
  // attaches onLoad, so the ref checks for an already-loaded image on mount too.
  const measure = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setMeasured(nearestAspect(img.naturalWidth, img.naturalHeight));
  }, []);

  return (
    <li>
      <div className={`group relative overflow-hidden rounded-lg bg-bg-2 ${aspect ? "" : "aspect-square"}`}>
        <button
          type="button"
          aria-pressed={picked}
          aria-disabled={locked}
          title={locked ? t("prompter.full", { max: MAX_PICKS }) : undefined}
          onClick={() => {
            if (!locked) onToggle(aspect ?? DEFAULT_ASPECT);
          }}
          className={`block w-full transition-opacity duration-150 ${locked ? "opacity-40" : ""}`}
        >
          {item.size ? (
            <Image
              src={item.src}
              alt={item.prompt}
              width={item.size.width}
              height={item.size.height}
              sizes="(min-width: 640px) 290px, 50vw"
              className="block h-auto w-full"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- final JPEG in public Storage; the optimizer would only re-encode it
            <img
              src={item.src}
              alt={item.prompt}
              loading="lazy"
              ref={measure}
              onLoad={(e) => measure(e.currentTarget)}
              className={`block h-auto w-full transition-opacity duration-300 ease-out ${aspect ? "opacity-100" : "opacity-0"}`}
            />
          )}
        </button>
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-lg ring-inset transition-shadow duration-150 ${
            picked ? "ring-2 ring-text-1" : locked ? "" : "ring-1 ring-transparent group-hover:ring-text-2"
          }`}
        />
        {picked && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-text-1 text-xs font-semibold text-bg-0 tabular-nums"
          >
            {number}
          </span>
        )}
        <button
          type="button"
          onClick={onOpen}
          aria-label={t("tile.open")}
          className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-md bg-black/50 text-white opacity-0 backdrop-blur-md transition-[opacity,background-color] duration-150 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-black/70 pointer-coarse:opacity-100"
        >
          <ExpandIcon className="size-4" />
        </button>
      </div>
    </li>
  );
}

/** A small square crop of a pick, for the bench slots and the result's source strip. */
export function Thumb({ item, className = "" }: { item: PoolItem; className?: string }) {
  return (
    <span className={`relative block overflow-hidden bg-bg-2 ${className}`}>
      {item.size ? (
        <Image src={item.src} alt="" fill sizes="56px" className="object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- the same Storage JPEG the grid already loaded
        <img src={item.src} alt="" className="absolute inset-0 size-full object-cover" />
      )}
    </span>
  );
}
