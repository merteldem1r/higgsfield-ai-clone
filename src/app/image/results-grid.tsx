"use client";

import { useEffect, useState } from "react";

import { AlertIcon, DownloadIcon, ReuseIcon, SparkleIcon } from "@/components/icons";
import type { AspectId } from "@/lib/credits";

import { Lightbox } from "./lightbox";
import type { Run, RunImage } from "./types";

const ASPECT_CLASS: Record<AspectId, string> = {
  "1:1": "aspect-square",
  "3:4": "aspect-3/4",
  "4:3": "aspect-4/3",
  "9:16": "aspect-9/16",
  "16:9": "aspect-video",
};

type Props = {
  runs: Run[];
  onRetry: (run: Run) => void;
  retryDisabled: boolean;
  onReusePrompt: (prompt: string) => void;
};

export type LightboxItem = { image: RunImage; prompt: string };

export function ResultsGrid({ runs, onRetry, retryDisabled, onReusePrompt }: Props) {
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);

  return (
    <>
      <ul aria-label="Generated images" className="grid grid-cols-2 items-start gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {runs.flatMap((run) => {
          const aspect = ASPECT_CLASS[run.request.aspect];
          if (run.status === "pending") {
            return Array.from({ length: run.request.batch }, (_, i) => (
              <li key={`${run.id}-${i}`} className={aspect}>
                <PendingTile prompt={run.request.prompt} startedAt={run.startedAt} />
              </li>
            ));
          }
          if (run.status === "failed") {
            return [
              <li key={run.id} className={aspect}>
                <FailedTile onRetry={() => onRetry(run)} disabled={retryDisabled} />
              </li>,
            ];
          }
          return run.images.map((image, i) => (
            <li key={`${run.id}-${i}`} className={aspect}>
              <FinishedTile
                image={image}
                prompt={run.request.prompt}
                fileName={`image-${run.id.slice(0, 8)}-${i + 1}.jpg`}
                onOpen={() => setLightbox({ image, prompt: run.request.prompt })}
                onReusePrompt={() => onReusePrompt(run.request.prompt)}
              />
            </li>
          ));
        })}
      </ul>
      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}

function PendingTile({ prompt, startedAt }: { prompt: string; startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 100);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <div
      role="status"
      aria-label="Generating image"
      className="flex size-full flex-col items-center justify-center gap-2 rounded-lg bg-bg-2 px-4 text-center motion-safe:shimmer motion-safe:animate-shimmer"
    >
      <SparkleIcon className="size-5 text-text-2" />
      <span className="text-xs font-medium text-text-2 tabular-nums">{elapsed.toFixed(1)}s</span>
      <span className="w-full truncate text-xs text-text-3">{prompt}</span>
    </div>
  );
}

function FailedTile({ onRetry, disabled }: { onRetry: () => void; disabled: boolean }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 rounded-lg bg-bg-2 px-4 text-center">
      <AlertIcon className="size-3.5 text-danger" />
      <p className="text-xs text-text-1">Generation failed — credits refunded</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="text-xs font-semibold text-accent-text hover:text-accent-hover disabled:text-text-disabled"
      >
        Retry
      </button>
    </div>
  );
}

const ICON_BUTTON =
  "flex size-8 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/70";

function FinishedTile({
  image,
  prompt,
  fileName,
  onOpen,
  onReusePrompt,
}: {
  image: RunImage;
  prompt: string;
  fileName: string;
  onOpen: () => void;
  onReusePrompt: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="group relative size-full overflow-hidden rounded-lg bg-bg-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- final JPEG in public Storage; the optimizer would only re-encode it */}
      <img
        src={image.url}
        alt={prompt}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        onLoad={() => setLoaded(true)}
        className={`size-full object-cover ${loaded ? "motion-safe:animate-reveal motion-reduce:animate-fade-in" : "opacity-0"}`}
      />
      <button type="button" onClick={onOpen} aria-label="Open image" className="absolute inset-0 cursor-zoom-in" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 bg-linear-to-t from-black/70 to-transparent p-2.5 pt-10 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
        <p className="flex-1 truncate text-xs text-white/90 pointer-coarse:invisible">{prompt}</p>
        <button
          type="button"
          onClick={() => void download(image.url, fileName)}
          aria-label="Download"
          className={`pointer-events-auto ${ICON_BUTTON}`}
        >
          <DownloadIcon className="size-4" />
        </button>
        <button type="button" onClick={onReusePrompt} aria-label="Reuse prompt" className={`pointer-events-auto ${ICON_BUTTON}`}>
          <ReuseIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

// <a download> is ignored for cross-origin URLs, so fetch the bytes and save them from a blob URL.
export async function download(url: string, fileName: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const objectUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}
