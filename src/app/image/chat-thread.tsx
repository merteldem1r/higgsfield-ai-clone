"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";

import { LogoMark, ReuseIcon, SparkleIcon } from "@/components/icons";
import { MODELS } from "@/lib/credits";

import { followUps, introLine, outroLine, rejectionLine } from "./assistant-lines";
import { Lightbox } from "./lightbox";
import { RunMedia } from "./run-media";
import type { GenerateRequest, Run, RunImage } from "./types";

export type LightboxItem = { image: RunImage; prompt: string };

const TIME = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// Rejections the visitor can simply retry. The others (budget, IP limit) can't succeed today.
const RETRYABLE = new Set(["FAL_DISABLED", "NETWORK", "UNKNOWN", "INTERNAL", "INVALID_INPUT"]);

type Props = {
  runs: Run[];
  /** Loads a prompt + settings into the composer without generating. */
  onLoad: (request: GenerateRequest) => void;
  onRetry: (run: Run) => void;
  onSignUp: () => void;
  retryDisabled: boolean;
};

export function ChatThread({ runs, onLoad, onRetry, onSignUp, retryDisabled }: Props) {
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);
  const reduced = usePrefersReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  useStickToBottom(listRef);

  // runs is newest-first; a chat reads oldest-first with the newest right above the composer.
  const ordered = runs.toReversed();

  return (
    <>
      <ol ref={listRef} role="log" aria-label="Conversation" className="mt-auto flex flex-col gap-10 pt-2">
        {ordered.map((run, i) => (
          <li key={run.id} className="flex flex-col gap-5">
            <UserBubble run={run} onReuse={() => onLoad(run.request)} />
            <AssistantTurn
              run={run}
              latest={i === ordered.length - 1}
              animate={run.live && !reduced}
              onOpen={(image) => setLightbox({ image, prompt: run.request.prompt })}
              onLoad={onLoad}
              onRetry={() => onRetry(run)}
              onSignUp={onSignUp}
              retryDisabled={retryDisabled}
            />
          </li>
        ))}
      </ol>
      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}

function UserBubble({ run, onReuse }: { run: Run; onReuse: () => void }) {
  const { prompt, model, aspect, batch } = run.request;

  return (
    <div className="group flex flex-col items-end gap-1.5 motion-safe:animate-rise-in">
      <div className="max-w-[88%] rounded-2xl rounded-br-md bg-bg-4 px-4 py-3 ring-1 ring-white/5 sm:max-w-xl">
        <p className="text-[15px] leading-6 wrap-break-word whitespace-pre-wrap text-text-1">{prompt}</p>
        <div className="mt-2.5 flex flex-wrap justify-end gap-1.5">
          <Tag>
            <SparkleIcon gradient className="size-3" />
            {MODELS[model].label}
          </Tag>
          <Tag>{aspect}</Tag>
          {batch > 1 && <Tag>{batch} images</Tag>}
        </div>
      </div>
      <div className="flex items-center gap-3 pr-1 text-xs text-text-3 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
        <time dateTime={new Date(run.startedAt).toISOString()}>{TIME.format(run.startedAt)}</time>
        <button
          type="button"
          onClick={onReuse}
          title="Load this prompt and its settings into the composer"
          className="flex items-center gap-1 rounded-sm font-medium text-text-2 transition-colors duration-150 hover:text-text-1"
        >
          <ReuseIcon className="size-3.5" />
          Reuse
        </button>
      </div>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-6 items-center gap-1 rounded-md bg-black/25 px-2 text-xs font-medium text-text-2">
      {children}
    </span>
  );
}

// Reply order: intro line, then the media, then the closing line, then actions. Each step waits for the
// previous line to finish typing, but the request itself started on click, so none of this delays the image.
function AssistantTurn({
  run,
  latest,
  animate,
  onOpen,
  onLoad,
  onRetry,
  onSignUp,
  retryDisabled,
}: {
  run: Run;
  latest: boolean;
  animate: boolean;
  onOpen: (image: RunImage) => void;
  onLoad: (request: GenerateRequest) => void;
  onRetry: () => void;
  onSignUp: () => void;
  retryDisabled: boolean;
}) {
  const [introDone, setIntroDone] = useState(!animate);
  const [outroDone, setOutroDone] = useState(!animate);
  const rejected = run.status === "rejected";
  const settled = run.status !== "pending";
  const code = run.rejection?.code ?? "";

  return (
    <div className="flex gap-3">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-2 ring-1 transition-shadow duration-300 ${
          run.status === "pending" ? "ring-accent/60" : "ring-border-2"
        }`}
      >
        <LogoMark className="size-5" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1">
        <StreamedText text={introLine(run)} animate={animate} onDone={() => setIntroDone(true)} />

        {introDone && !rejected && (
          <RunMedia run={run} onOpen={onOpen} onRetry={onRetry} retryDisabled={retryDisabled} />
        )}

        {introDone && settled && (
          <StreamedText
            text={rejected ? rejectionLine(run) : outroLine(run)}
            animate={animate}
            onDone={() => setOutroDone(true)}
          />
        )}

        {latest && outroDone && settled && (
          <div className="flex flex-wrap gap-2 motion-safe:animate-rise-in motion-reduce:animate-fade-in">
            {run.status === "done" &&
              followUps(run.request).map((f) => (
                <Chip key={f.label} onClick={() => onLoad(f.request)}>
                  {f.label}
                  <span className="flex items-center gap-1 text-xs text-text-2 tabular-nums">
                    <SparkleIcon gradient className="size-3" />
                    {f.cost}
                  </span>
                </Chip>
              ))}
            {rejected && code === "INSUFFICIENT_CREDITS" && <Chip onClick={onSignUp}>Sign up for 50 credits</Chip>}
            {rejected && RETRYABLE.has(code) && (
              <Chip onClick={onRetry} disabled={retryDisabled}>
                Try again
              </Chip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 items-center gap-2 rounded-full border border-border-3 bg-bg-1 px-3.5 text-sm font-medium text-text-1 transition-colors duration-150 hover:border-accent/50 hover:bg-bg-3 disabled:text-text-disabled disabled:hover:border-border-3 disabled:hover:bg-bg-1"
    >
      {children}
    </button>
  );
}

// Word-by-word typing with a short "thinking" beat first, longer pauses at punctuation, and a caret.
function StreamedText({ text, animate, onDone }: { text: string; animate: boolean; onDone: () => void }) {
  const words = text.split(/(?<=\s)/);
  const [shown, setShown] = useState(animate ? 0 : words.length);
  const latestOnDone = useRef(onDone);

  useEffect(() => {
    latestOnDone.current = onDone;
  });

  useEffect(() => {
    if (!animate) return;
    const parts = text.split(/(?<=\s)/);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      i += 1;
      setShown(i);
      if (i >= parts.length) {
        latestOnDone.current();
        return;
      }
      const word = parts[i - 1];
      const delay = /[.!?:]\s*$/.test(word) ? 220 : /[,;]\s*$/.test(word) ? 110 : 30 + Math.random() * 30;
      timer = setTimeout(step, delay);
    };
    timer = setTimeout(step, 450);
    return () => clearTimeout(timer);
  }, [animate, text]);

  const streaming = animate && shown < words.length;

  return (
    <p aria-busy={streaming} className="max-w-2xl text-[15px] leading-6 text-text-1/90">
      {words.slice(0, shown).join("")}
      {streaming && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[1.05em] w-0.75 translate-y-[0.18em] rounded-full bg-brand-gradient motion-safe:animate-pulse"
        />
      )}
    </p>
  );
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

// While the reply types and tiles appear, keep the newest line in view, but only if the visitor is already
// near the bottom. Someone scrolled up to read an older turn isn't dragged down.
function useStickToBottom(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    let stick = true;
    const onScroll = () => {
      stick = root.scrollHeight - window.scrollY - window.innerHeight < 160;
    };
    const observer = new ResizeObserver(() => {
      if (stick) window.scrollTo({ top: root.scrollHeight });
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(el);
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [ref]);
}
