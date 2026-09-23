"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { AlertIcon, DownloadIcon, ReuseIcon, SparkleIcon, SpinnerIcon } from "@/components/icons";
import { MODELS, type AspectId } from "@/lib/credits";

import { Lightbox } from "./lightbox";
import type { Run, RunImage } from "./types";

export type LightboxItem = { image: RunImage; prompt: string };

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

const TIME = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

type Props = {
  runs: Run[];
  onRetry: (run: Run) => void;
  retryDisabled: boolean;
  onReuse: (run: Run) => void;
};

export function RunFeed({ runs, onRetry, retryDisabled, onReuse }: Props) {
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);

  return (
    <>
      {/* Chat order: oldest first, newest right above the composer. mt-auto pins a short feed to the bottom. */}
      <ol aria-label="Your generations" className="mt-auto flex flex-col divide-y divide-border-1">
        {runs.toReversed().map((run) => {
          const { prompt, aspect, batch, model } = run.request;
          const count = run.status === "done" ? run.images.length : run.status === "failed" ? 1 : batch;
          const tile = `${TILE_ASPECT[aspect]} w-full`;

          return (
            <li key={run.id} className="py-8 first:pt-2 motion-safe:animate-rise-in">
              <RunHeader run={run} onReuse={() => onReuse(run)} />
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
                {run.status === "failed" && (
                  <FailedTile className={tile} onRetry={() => onRetry(run)} disabled={retryDisabled} />
                )}
                {run.status === "done" &&
                  run.images.map((image, i) => (
                    <ImageTile
                      key={image.url}
                      className={tile}
                      image={image}
                      prompt={prompt}
                      phase={GLOW_PHASE[i]}
                      fileName={`image-${run.id.slice(0, 8)}-${i + 1}.jpg`}
                      onOpen={() => setLightbox({ image, prompt })}
                    />
                  ))}
              </div>
            </li>
          );
        })}
      </ol>
      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}

function RunHeader({ run, onReuse }: { run: Run; onReuse: () => void }) {
  const { prompt, model, aspect, batch } = run.request;

  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] leading-5.5 text-text-1">{prompt}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Tag>
            <SparkleIcon gradient className="size-3" />
            {MODELS[model].label}
          </Tag>
          <Tag>{aspect}</Tag>
          {batch > 1 && <Tag>{batch} images</Tag>}
          {run.status === "pending" && (
            <span className="ml-1 flex items-center gap-1.5 text-xs font-medium text-accent-text">
              <SpinnerIcon className="size-3 motion-safe:animate-spin" />
              Generating
            </span>
          )}
          {run.status === "failed" && (
            <span className="ml-1 text-xs font-medium text-danger">Failed, credits refunded</span>
          )}
          {run.status === "done" && (
            <time dateTime={new Date(run.startedAt).toISOString()} className="ml-1 text-xs text-text-3">
              {TIME.format(run.startedAt)}
            </time>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onReuse}
        title="Load this prompt and its settings into the composer"
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border-3 bg-bg-1 px-2.5 text-xs font-medium text-text-2 transition-colors duration-150 hover:bg-bg-3 hover:text-text-1"
      >
        <ReuseIcon className="size-3.5" />
        Reuse
      </button>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-6 items-center gap-1 rounded-md bg-bg-3 px-2 text-xs font-medium text-text-2">
      {children}
    </span>
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
      className={`relative isolate overflow-hidden rounded-xl bg-bg-2 ring-1 ring-white/6 ring-inset ${className}`}
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
}: {
  className: string;
  image: RunImage;
  prompt: string;
  phase: string;
  fileName: string;
  onOpen: () => void;
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
        <button type="button" onClick={() => void download(image.url, fileName)} aria-label="Download" className={ICON_BUTTON}>
          <DownloadIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

// <a download> is ignored for cross-origin URLs, so fetch the bytes and save them from a blob URL.
async function download(url: string, fileName: string) {
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
