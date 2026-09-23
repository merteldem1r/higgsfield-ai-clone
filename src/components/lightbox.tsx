"use client";

import { useEffect, useRef } from "react";

import { FavouriteButton } from "./favourite-button";
import { XIcon } from "./icons";

export type LightboxItem = { image: { url: string }; prompt: string };

export function Lightbox({
  item,
  onClose,
  favourite,
}: {
  item: LightboxItem | null;
  onClose: () => void;
  /** Omitted when the image has no asset id to save against. */
  favourite?: { value: boolean; onChange: (favourite: boolean) => void };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="Image preview"
      className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-overlay open:animate-fade-in"
    >
      {item && (
        <figure className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- same Storage JPEG as the tile */}
          <img
            src={item.image.url}
            alt={item.prompt}
            className="max-h-[82dvh] max-w-[92vw] rounded-xl object-contain"
          />
          <figcaption className="max-w-[92vw] text-center text-sm text-text-2 sm:max-w-2xl">{item.prompt}</figcaption>
        </figure>
      )}
      {item && favourite && (
        <FavouriteButton
          favourite={favourite.value}
          onChange={favourite.onChange}
          tone="solid"
          className="fixed top-4 right-14 size-8"
        />
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="fixed top-4 right-4 flex size-8 items-center justify-center rounded-full bg-bg-3 text-text-2 transition-colors duration-150 hover:bg-bg-5 hover:text-text-1"
      >
        <XIcon className="size-4" />
      </button>
    </dialog>
  );
}
