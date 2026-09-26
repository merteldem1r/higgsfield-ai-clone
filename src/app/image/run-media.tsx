"use client";

import { useEffect, useRef, useState } from "react";

import { FavouriteButton } from "@/components/favourite-button";
import { AlertIcon, DownloadIcon } from "@/components/icons";
import { useT } from "@/components/locale-provider";
import { MODELS, type AspectId } from "@/lib/credits";
import { download } from "@/lib/download";

import type { Run, RunImage } from "./types";

// A run's images fill the column, capped at 70vh. A batch shares one row height, so it reads as a set:
// two side by side, three across, four as two by two. The row's max width keeps the cap on every count.
const RATIO: Record<AspectId, string> = {
  "1:1": "[--ratio:1]",
  "3:4": "[--ratio:0.75]",
  "4:3": "[--ratio:1.3333]",
  "9:16": "[--ratio:0.5625]",
  "16:9": "[--ratio:1.7778]",
};
const LAYOUT: Record<number, string> = {
  1: "[--n:1] grid-cols-1 [--row-h:70vh]",
  2: "[--n:2] grid-cols-2 [--row-h:70vh]",
  3: "[--n:3] grid-cols-3 [--row-h:60vh]",
  4: "[--n:2] grid-cols-2 [--row-h:40vh]",
};
const ROW = "grid w-full gap-2 max-w-[calc(var(--row-h)*var(--ratio)*var(--n)_+_(var(--n)_-_1)*0.5rem)]";
const TILE = "relative isolate w-full overflow-hidden rounded-lg bg-bg-1 aspect-(--ratio)";

export function RunMedia({
  run,
  onOpen,
  onFavourite,
  onRetry,
  retryDisabled,
  failureLine,
}: {
  run: Run;
  onOpen: (image: RunImage) => void;
  onFavourite: (image: RunImage, favourite: boolean) => void;
  onRetry: () => void;
  retryDisabled: boolean;
  failureLine: string;
}) {
  const { prompt, aspect, batch, model } = run.request;
  const count = run.status === "done" ? run.images.length : run.status === "failed" ? 1 : batch;

  return (
    <div className={`${ROW} ${RATIO[aspect]} ${LAYOUT[count] ?? LAYOUT[4]}`}>
      {run.status === "pending" &&
        Array.from({ length: batch }, (_, i) => (
          <PendingFrame
            key={i}
            startedAt={run.startedAt}
            estSeconds={MODELS[model].estSeconds * (1 + 0.25 * (batch - 1))}
            showCounter={i === 0}
          />
        ))}
      {run.status === "failed" && (
        <FailedFrame line={failureLine} onRetry={onRetry} disabled={retryDisabled} />
      )}
      {run.status === "done" &&
        run.images.map((image, i) => (
          <ImageTile
            key={image.url}
            image={image}
            prompt={prompt}
            live={run.live}
            fileName={`darkroom-${run.id.slice(0, 8)}-${i + 1}.jpg`}
            onOpen={() => onOpen(image)}
            onFavourite={(favourite) => onFavourite(image, favourite)}
          />
        ))}
    </div>
  );
}

// The logo colours breathing slowly under the frame: the one thing that moves while a run is live.
function Glow() {
  return (
    <div
      aria-hidden
      className="absolute -inset-1/2 -z-10 bg-brand-conic opacity-20 blur-3xl motion-safe:animate-breathe-slow"
    />
  );
}

// The size the image will be, with the elapsed time and an honest estimate that never claims "done" early.
function PendingFrame({ startedAt, estSeconds, showCounter }: { startedAt: number; estSeconds: number; showCounter: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const t = useT();
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000;
      setElapsed(seconds);
      // Eases toward 95%; the last 5% is the image arriving.
      barRef.current?.style.setProperty("scale", `${0.95 * (1 - Math.exp(-seconds / estSeconds))} 1`);
    }, 100);
    return () => clearInterval(timer);
  }, [startedAt, estSeconds]);

  return (
    <div role="status" aria-label={t("tile.generatingLabel")} className={`${TILE} ring-1 ring-line-2 ring-inset`}>
      <Glow />
      {showCounter && (
        <div className="flex size-full items-center justify-center">
          <span className="text-sm text-text-2 tabular-nums">{elapsed.toFixed(1)}s</span>
        </div>
      )}
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/8">
        <span
          ref={barRef}
          className="block h-full origin-left scale-x-0 bg-brand-gradient transition-[scale] duration-100 ease-linear"
        />
      </span>
    </div>
  );
}

function FailedFrame({ line, onRetry, disabled }: { line: string; onRetry: () => void; disabled: boolean }) {
  const t = useT();
  return (
    <div className={`${TILE} flex flex-col items-center justify-center gap-3 px-6 text-center ring-1 ring-danger/30 ring-inset`}>
      <AlertIcon className="size-5 text-danger" />
      <p className="max-w-sm text-sm text-text-1">{line}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="flex h-9 items-center rounded-md bg-bg-2 px-3.5 text-sm font-medium text-text-1 transition-colors duration-150 hover:bg-bg-3 disabled:text-text-disabled disabled:hover:bg-bg-2"
      >
        {t("thread.tryAgain")}
      </button>
    </div>
  );
}

const ICON_BUTTON =
  "pointer-events-auto flex size-8 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/75";

function ImageTile({
  image,
  prompt,
  live,
  fileName,
  onOpen,
  onFavourite,
}: {
  image: RunImage;
  prompt: string;
  live: boolean;
  fileName: string;
  onOpen: () => void;
  onFavourite: (favourite: boolean) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const t = useT();

  return (
    <div className={`group ${TILE}`}>
      {/* A live run keeps its glow under the frame until the bytes arrive; then the image crossfades over it. */}
      {live && !loaded && <Glow />}
      {/* eslint-disable-next-line @next/next/no-img-element -- final JPEG in public Storage; the optimizer would only re-encode it */}
      <img
        src={image.url}
        alt={prompt}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        loading={live ? "eager" : "lazy"}
        onLoad={() => setLoaded(true)}
        className={`size-full object-cover transition-opacity ease-out ${live ? "duration-600" : "duration-300"} ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      <button type="button" onClick={onOpen} aria-label={t("tile.open")} className="absolute inset-0 cursor-zoom-in" />
      <div className="pointer-events-none absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
        {image.id && (
          <FavouriteButton favourite={image.favourite} onChange={onFavourite} className="pointer-events-auto size-8" />
        )}
        <button type="button" onClick={() => void download(image.url, fileName)} aria-label={t("tile.download")} className={ICON_BUTTON}>
          <DownloadIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
