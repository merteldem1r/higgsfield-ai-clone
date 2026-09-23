"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";

import { useApp } from "@/components/app-provider";

import { LogoMark, ReuseIcon, SparkleIcon } from "@/components/icons";
import { Lightbox } from "@/components/lightbox";
import { useLocale, useT } from "@/components/locale-provider";
import { MODELS, UPGRADE_BONUS } from "@/lib/credits";

import { followUps, introLine, outroLine, rejectionLine } from "./assistant-lines";
import { RunMedia } from "./run-media";
import type { GenerateRequest, Run, RunImage } from "./types";

const TIME_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };

// Rejections the visitor can simply retry. The others (budget, IP limit) can't succeed today.
const RETRYABLE = new Set(["FAL_DISABLED", "NETWORK", "UNKNOWN", "INTERNAL", "INVALID_INPUT"]);

type Props = {
  runs: Run[];
  /** Loads a prompt + settings into the composer without generating. */
  onLoad: (request: GenerateRequest) => void;
  onRetry: (run: Run) => void;
  onFavourite: (image: RunImage, favourite: boolean) => void;
  onSignUp: () => void;
  retryDisabled: boolean;
};

export function ChatThread({ runs, onLoad, onRetry, onFavourite, onSignUp, retryDisabled }: Props) {
  // A reference, not a snapshot, so a heart clicked inside the lightbox shows the live value.
  const [lightbox, setLightbox] = useState<{ runId: string; url: string } | null>(null);
  const lightboxRun = lightbox ? runs.find((run) => run.id === lightbox.runId) : undefined;
  const lightboxImage = lightboxRun?.images.find((image) => image.url === lightbox?.url);
  const reduced = usePrefersReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const t = useT();
  useStickToBottom(listRef);

  // runs is newest-first; a chat reads oldest-first with the newest right above the composer.
  const ordered = runs.toReversed();

  return (
    <>
      <ol ref={listRef} role="log" aria-label={t("thread.label")} className="mt-auto flex flex-col gap-10 pt-2">
        {ordered.map((run, i) => (
          <li key={run.id} className="flex flex-col gap-5">
            <UserBubble run={run} onReuse={() => onLoad(run.request)} />
            <AssistantTurn
              run={run}
              latest={i === ordered.length - 1}
              animate={run.live && !reduced}
              onOpen={(image) => setLightbox({ runId: run.id, url: image.url })}
              onFavourite={onFavourite}
              onLoad={onLoad}
              onRetry={() => onRetry(run)}
              onSignUp={onSignUp}
              retryDisabled={retryDisabled}
            />
          </li>
        ))}
      </ol>
      <Lightbox
        item={lightboxRun && lightboxImage ? { image: lightboxImage, prompt: lightboxRun.request.prompt } : null}
        onClose={() => setLightbox(null)}
        favourite={
          lightboxImage?.id
            ? { value: lightboxImage.favourite, onChange: (favourite) => onFavourite(lightboxImage, favourite) }
            : undefined
        }
      />
    </>
  );
}

function UserBubble({ run, onReuse }: { run: Run; onReuse: () => void }) {
  const { prompt, model, aspect, batch } = run.request;
  const { locale, t } = useLocale();

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
          {batch > 1 && <Tag>{t("thread.images", { n: batch })}</Tag>}
        </div>
      </div>
      <div className="flex items-center gap-3 pr-1 text-xs text-text-3 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
        <time dateTime={new Date(run.startedAt).toISOString()}>{new Intl.DateTimeFormat(locale, TIME_FORMAT).format(run.startedAt)}</time>
        <button
          type="button"
          onClick={onReuse}
          title={t("thread.reuseTitle")}
          className="flex items-center gap-1 rounded-sm font-medium text-text-2 transition-colors duration-150 hover:text-text-1"
        >
          <ReuseIcon className="size-3.5" />
          {t("thread.reuse")}
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
  onFavourite,
  onLoad,
  onRetry,
  onSignUp,
  retryDisabled,
}: {
  run: Run;
  latest: boolean;
  animate: boolean;
  onOpen: (image: RunImage) => void;
  onFavourite: (image: RunImage, favourite: boolean) => void;
  onLoad: (request: GenerateRequest) => void;
  onRetry: () => void;
  onSignUp: () => void;
  retryDisabled: boolean;
}) {
  const router = useRouter();
  const { account } = useApp();
  const { locale, t } = useLocale();
  // A signed-in visitor has no signup bonus left to offer; running out points them to plans instead.
  const member = account?.status === "member";
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
        <StreamedText text={introLine(run, locale, t)} animate={animate} onDone={() => setIntroDone(true)} />

        {introDone && !rejected && (
          <RunMedia
            run={run}
            onOpen={onOpen}
            onFavourite={onFavourite}
            onRetry={onRetry}
            retryDisabled={retryDisabled}
          />
        )}

        {introDone && settled && (
          <StreamedText
            text={rejected ? rejectionLine(run, t, member) : outroLine(run, locale, t)}
            animate={animate}
            onDone={() => setOutroDone(true)}
          />
        )}

        {latest && outroDone && settled && (
          <div className="flex flex-wrap gap-2 motion-safe:animate-rise-in motion-reduce:animate-fade-in">
            {run.status === "done" &&
              followUps(run.request, t).map((f) => (
                <Chip key={f.label} onClick={() => onLoad(f.request)}>
                  {f.label}
                  <span className="flex items-center gap-1 text-xs text-text-2 tabular-nums">
                    <SparkleIcon gradient className="size-3" />
                    {f.cost}
                  </span>
                </Chip>
              ))}
            {rejected && code === "INSUFFICIENT_CREDITS" &&
              (member ? (
                <Chip onClick={() => router.push("/pricing")}>{t("thread.seePlans")}</Chip>
              ) : (
                <Chip onClick={onSignUp}>{t("thread.signUpFor", { n: UPGRADE_BONUS })}</Chip>
              ))}
            {rejected && RETRYABLE.has(code) && (
              <Chip onClick={onRetry} disabled={retryDisabled}>
                {t("thread.tryAgain")}
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
