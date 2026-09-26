"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { CheckIcon, PlusIcon, ReuseIcon } from "@/components/icons";
import { useLocale, useT } from "@/components/locale-provider";
import { MAX_PROMPT_LENGTH, MODELS, type ModelId } from "@/lib/credits";

import { Thumb } from "./pick-grid";
import type { LookResult } from "./types";

const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
// Typical wall time for the look call; drives the estimate bar only.
const EST_SECONDS = 3;

const ACTION =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-bg-2 px-3 text-xs font-medium text-text-1 transition-colors duration-150 hover:bg-bg-3";

export const phrasesOn = (result: LookResult) => result.look.filter((_, i) => !result.off.includes(i)).map((phrase) => phrase.text);

// Subject first, like a preset, so the studio can pre-select it and the first keystroke replaces it.
export const lookPrompt = (subject: string, result: LookResult) =>
  [subject, ...phrasesOn(result)].join(", ").slice(0, MAX_PROMPT_LENGTH);

export function LookFrame({
  result,
  model,
  onTogglePhrase,
  onOpen,
}: {
  result: LookResult;
  /** What "Open in studio" pre-selects, so the hint can name it and its cost. */
  model: ModelId;
  onTogglePhrase: (index: number) => void;
  onOpen: (subject: string) => void;
}) {
  const { locale, t } = useLocale();
  // The phrase under the pointer or focus; its source picks stay lit and the others dim.
  const [traced, setTraced] = useState<number | null>(null);
  const on = phrasesOn(result);
  const lit = traced === null ? null : result.look[traced]?.from;

  return (
    <article aria-label={t("prompter.resultLabel")} className="flex flex-col gap-8 motion-safe:animate-fade-in">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-h3 font-medium">{t("prompter.look")}</h2>
          <ol aria-label={t("prompter.fromPicks")} className="flex gap-1.5">
            {result.picks.map((pick, i) => (
              <li key={pick.item.id}>
                <Thumb
                  item={pick.item}
                  className={`size-8 rounded-sm transition-opacity duration-150 ${lit && !lit.includes(i) ? "opacity-30" : ""}`}
                />
              </li>
            ))}
          </ol>
          <dl className="ml-auto flex gap-x-3 text-xs text-text-2 tabular-nums">
            <Fact label={t("run.time")}>
              <time dateTime={new Date(result.at).toISOString()} className="text-text-3">
                {new Intl.DateTimeFormat(locale, TIME).format(result.at)}
              </time>
            </Fact>
            <Fact label={t("run.took")}>{`${result.seconds.toFixed(1)}s`}</Fact>
          </dl>
        </div>

        <ul aria-label={t("prompter.phrases")} className="flex flex-wrap gap-2">
          {result.look.map((phrase, i) => {
            const isOn = !result.off.includes(i);
            const last = isOn && on.length === 1;
            return (
              <li key={phrase.text}>
                <button
                  type="button"
                  aria-pressed={isOn}
                  aria-disabled={last}
                  title={last ? t("prompter.keepOne") : undefined}
                  onClick={() => {
                    if (!last) onTogglePhrase(i);
                  }}
                  onPointerEnter={() => setTraced(i)}
                  onPointerLeave={() => setTraced(null)}
                  onFocus={() => setTraced(i)}
                  onBlur={() => setTraced(null)}
                  className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors duration-150 ${
                    isOn ? "bg-bg-2 text-text-1 hover:bg-bg-3" : "text-text-3 ring-1 ring-line-2 ring-inset hover:text-text-2"
                  }`}
                >
                  {/* Both states carry an icon, so switching a phrase never shifts the row. */}
                  {isOn ? <CheckIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
                  {phrase.text}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-text-2">{t("prompter.lookHint")}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-h3 font-medium">{t("prompter.tryOn")}</h2>
        <ul className="flex flex-col">
          {result.subjects.map((subject) => (
            <li
              key={subject}
              className="flex flex-col gap-2 border-t border-line-1 py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              <p className="min-w-0 text-sm leading-5 wrap-break-word">
                <span className="text-text-1">{subject}</span>
                <span className="text-text-2">, {on.join(", ")}</span>
              </p>
              <button
                type="button"
                onClick={() => onOpen(subject)}
                title={t("prompter.openTitle")}
                className={`${ACTION} self-start sm:self-auto`}
              >
                <ReuseIcon className="size-3.5" />
                {t("prompter.open")}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-text-2">
          {t("prompter.subjectHint", { model: MODELS[model].label, n: MODELS[model].credits })}
        </p>
      </div>
    </article>
  );
}

// The studio's pending frame at the size of a result: the logo colours breathing, the elapsed time and an
// estimate that never claims "done" early. The one thing that moves while the model reads.
export function PendingLook({ startedAt, count }: { startedAt: number; count: number }) {
  const t = useT();
  const [elapsed, setElapsed] = useState(0);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000;
      setElapsed(seconds);
      barRef.current?.style.setProperty("scale", `${0.95 * (1 - Math.exp(-seconds / EST_SECONDS))} 1`);
    }, 100);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <div
      role="status"
      aria-label={t("prompter.finding")}
      className="relative isolate flex h-48 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg bg-bg-1 px-6 text-center ring-1 ring-line-2 ring-inset"
    >
      <div aria-hidden className="absolute -inset-1/2 -z-10 bg-brand-conic opacity-20 blur-3xl motion-safe:animate-breathe-slow" />
      <span className="text-sm text-text-2 tabular-nums">{elapsed.toFixed(1)}s</span>
      <p className="text-xs text-text-2">{t("prompter.reading", { n: count })}</p>
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/8">
        <span ref={barRef} className="block h-full origin-left scale-x-0 bg-brand-gradient transition-[scale] duration-100 ease-linear" />
      </span>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1">
      <dt className="sr-only">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
