"use client";

import { useRef } from "react";

import { useApp } from "./app-provider";
import { HeartIcon } from "./icons";

async function saveFavourite(assetId: string, favourite: boolean): Promise<boolean> {
  try {
    const res = await fetch(`/api/assets/${assetId}/favourite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favourite }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Optimistic favourites. `apply` updates the owner's state at once; the server catches up.
 * One request per asset at a time: clicks made while one is in flight only move the target,
 * and the loop sends whatever the latest target is once the request lands. So responses can't
 * arrive out of order, and a failure rolls back to the last value the server confirmed.
 */
export function useFavourite(apply: (assetId: string, favourite: boolean) => void) {
  const { showToast } = useApp();
  const wanted = useRef(new Map<string, boolean>());
  const confirmed = useRef(new Map<string, boolean>());
  const inFlight = useRef(new Set<string>());

  return async function setFavourite(assetId: string, favourite: boolean, current: boolean) {
    if (!confirmed.current.has(assetId)) confirmed.current.set(assetId, current);
    wanted.current.set(assetId, favourite);
    apply(assetId, favourite);
    if (inFlight.current.has(assetId)) return;

    inFlight.current.add(assetId);
    try {
      let target = wanted.current.get(assetId);
      while (target !== undefined && target !== confirmed.current.get(assetId)) {
        if (!(await saveFavourite(assetId, target))) {
          const last = confirmed.current.get(assetId) ?? current;
          wanted.current.set(assetId, last);
          apply(assetId, last);
          showToast({ tone: "danger", text: "Couldn't update favourites. Try again." });
          return;
        }
        confirmed.current.set(assetId, target);
        target = wanted.current.get(assetId);
      }
    } finally {
      inFlight.current.delete(assetId);
    }
  };
}

// "image" sits on a photo (glass); "solid" sits on the lightbox backdrop, where glass would vanish.
const TONE = {
  image: "rounded-md bg-black/50 text-white backdrop-blur-sm hover:bg-black/75",
  solid: "rounded-full bg-bg-3 text-text-2 hover:bg-bg-5 hover:text-text-1",
};

export function FavouriteButton({
  favourite,
  onChange,
  tone = "image",
  className = "",
}: {
  favourite: boolean;
  onChange: (favourite: boolean) => void;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!favourite)}
      aria-pressed={favourite}
      aria-label={favourite ? "Remove from favourites" : "Add to favourites"}
      className={`flex items-center justify-center transition-colors duration-150 ${TONE[tone]} ${className}`}
    >
      <HeartIcon
        key={String(favourite)}
        className={`size-4 ${favourite ? "fill-brand-pink text-brand-pink motion-safe:animate-pop-in" : ""}`}
      />
    </button>
  );
}
