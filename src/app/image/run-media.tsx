"use client";

import { useEffect, useRef, useState } from "react";

import { FavouriteButton } from "@/components/favourite-button";
import { AlertIcon, DownloadIcon, SparkleIcon } from "@/components/icons";
import { MODELS, type AspectId } from "@/lib/credits";
import { download } from "@/lib/download";

import type { Run, RunImage } from "./types";

// Each run's row shares one height, so a batch reads as a set. Kept modest on purpose: the lightbox is the big view.
// Tiles carry the aspect; the row carries --ratio/--n/--row-h so its max width keeps that height.
const TILE_ASPECT: Record<AspectId, string> = {
  "1:1": "aspect-square",
  "3:4": "aspect-3/4",
  "4:3": "aspect-4/3",
  "9:16": "aspect-9/16",
  "16:9": "aspect-video",
};
const ROW_RATIO: Record<AspectId, string> = {
  "1:1": "[--ratio:1]",
  "3:4": "[--ratio:0.75]",
  "4:3": "[--ratio:1.3333]",
  "9:16": "[--ratio:0.5625]",
  "16:9": "[--ratio:1.7778]",
};
const ROW_COUNT: Record<number, string> = {
  1: "[--n:1] grid-cols-1 [--row-h:min(38vh,360px)]",
  2: "[--n:2] grid-cols-2 [--row-h:min(32vh,300px)]",
  3: "[--n:3] grid-cols-3 [--row-h:min(28vh,260px)]",
  4: "[--n:4] grid-cols-2 sm:grid-cols-4 [--row-h:min(26vh,240px)]",
};
const ROW = "grid w-full gap-2 max-w-[calc(var(--row-h)*var(--ratio)*var(--n)_+_(var(--n)_-_1)*0.5rem)]";

// Staggers the glow's rotation so a batch doesn't swirl in lockstep.
const GLOW_PHASE = ["", "[animation-delay:-1.75s]", "[animation-delay:-3.5s]", "[animation-delay:-5.25s]"];

export function RunMedia({
  run,
  onOpen,
  onFavourite,
  onRetry,
  retryDisabled,
}: {
  run: Run;
  onOpen: (image: RunImage) => void;
  onFavourite: (image: RunImage, favourite: boolean) => void;
  onRetry: () => void;
  retryDisabled: boolean;
}) {
  const { prompt, aspect, batch, model } = run.request;
  const count = run.status === "done" ? run.images.length : run.status === "failed" ? 1 : batch;
  const tile = `${TILE_ASPECT[aspect]} w-full`;

  return (
    <div className={`${ROW} ${ROW_RATIO[aspect]} ${ROW_COUNT[count] ?? ROW_COUNT[4]}`}>
      {run.status === "pending" &&
        Array.from({ length: batch }, (_, i) => (
          <GeneratingTile
            key={i}
            className={tile}
            startedAt={run.startedAt}
            estSeconds={MODELS[model].estSeconds * (1 + 0.25 * (batch - 1))}
            phase={GLOW_PHASE[i]}
          />
        ))}
      {run.status === "failed" && <FailedTile className={tile} onRetry={onRetry} disabled={retryDisabled} />}
      {run.status === "done" &&
        run.images.map((image, i) => (
          <ImageTile
            key={image.url}
            className={tile}
            image={image}
            prompt={prompt}
            phase={GLOW_PHASE[i]}
            fileName={`image-${run.id.slice(0, 8)}-${i + 1}.jpg`}
            onOpen={() => onOpen(image)}
            onFavourite={(favourite) => onFavourite(image, favourite)}
          />
        ))}
    </div>
  );
}

// The logo colors swirling under a soft sweep. Also sits under a finished image until its bytes arrive.
function Glow({ phase }: { phase: string }) {
  return (
    <>
      <div
        aria-hidden
        className={`absolute -inset-1/2 -z-10 bg-brand-conic opacity-30 blur-3xl will-change-transform motion-safe:animate-aurora ${phase}`}
      />
      <div aria-hidden className="absolute inset-0 -z-10 shimmer motion-safe:animate-shimmer" />
    </>
  );
}

function GeneratingTile({
  className,
  startedAt,
  estSeconds,
  phase,
}: {
  className: string;
  startedAt: number;
  estSeconds: number;
  phase: string;
}) {
  const [elapsed, setElapsed] = useState(0);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000;
      setElapsed(seconds);
      // An estimate that eases toward 95% and never claims "done" before the image actually is.
      barRef.current?.style.setProperty("scale", `${0.95 * (1 - Math.exp(-seconds / estSeconds))} 1`);
    }, 100);
    return () => clearInterval(timer);
  }, [startedAt, estSeconds]);

  return (
    <div
      role="status"
      aria-label="Generating image"
      className={`relative isolate overflow-hidden rounded-xl bg-bg-2 ring-1 ring-white/6 ring-inset motion-safe:animate-rise-in ${className}`}
    >
      <Glow phase={phase} />
      <div className="flex size-full flex-col items-center justify-center gap-1.5 px-3 text-center">
        <SparkleIcon gradient className="size-6 motion-safe:animate-breathe" />
        <span className="mt-0.5 text-sm font-medium text-text-1">Generating</span>
        <span className="text-xs text-text-2 tabular-nums">{elapsed.toFixed(1)}s</span>
      </div>
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/8">
        <span
          ref={barRef}
          className="block h-full origin-left scale-x-0 bg-brand-gradient transition-[scale] duration-100 ease-linear"
        />
      </span>
    </div>
  );
}

function FailedTile({ className, onRetry, disabled }: { className: string; onRetry: () => void; disabled: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl bg-bg-2 px-4 text-center ring-1 ring-danger/25 ring-inset ${className}`}
    >
      <AlertIcon className="size-5 text-danger" />
      <p className="text-sm font-medium text-text-1">Generation failed</p>
      <p className="text-xs text-text-2">Your credits were refunded.</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="mt-2 flex h-8 items-center rounded-md border border-border-3 bg-bg-1 px-3 text-xs font-semibold text-text-1 transition-colors duration-150 hover:bg-bg-3 disabled:text-text-disabled disabled:hover:bg-bg-1"
      >
        Try again
      </button>
    </div>
  );
}

const ICON_BUTTON =
  "pointer-events-auto flex size-8 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/75";

function ImageTile({
  className,
  image,
  prompt,
  phase,
  fileName,
  onOpen,
  onFavourite,
}: {
  className: string;
  image: RunImage;
  prompt: string;
  phase: string;
  fileName: string;
  onOpen: () => void;
  onFavourite: (favourite: boolean) => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`group relative isolate overflow-hidden rounded-xl bg-bg-2 ${className}`}>
      {!loaded && <Glow phase={phase} />}
      {/* eslint-disable-next-line @next/next/no-img-element -- final JPEG in public Storage; the optimizer would only re-encode it */}
      <img
        src={image.url}
        alt={prompt}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        onLoad={() => setLoaded(true)}
        className={`size-full object-cover transition-[scale] duration-300 ease-out motion-safe:group-hover:scale-[1.015] ${
          loaded ? "motion-safe:animate-reveal motion-reduce:animate-fade-in" : "opacity-0"
        }`}
      />
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/6 ring-inset" />
      <button type="button" onClick={onOpen} aria-label="Open image" className="absolute inset-0 cursor-zoom-in" />
      <div className="pointer-events-none absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
        {image.id && (
          <FavouriteButton favourite={image.favourite} onChange={onFavourite} className="pointer-events-auto size-8" />
        )}
        <button type="button" onClick={() => void download(image.url, fileName)} aria-label="Download" className={ICON_BUTTON}>
          <DownloadIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
