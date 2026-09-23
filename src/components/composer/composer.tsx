"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

import { useApp } from "@/components/app-provider";
import { AspectIcon, MinusIcon, PlusIcon, ReuseIcon, SparkleIcon, SpinnerIcon, WandIcon } from "@/components/icons";
import { useT } from "@/components/locale-provider";
import {
  ASPECTS,
  BATCH_MAX,
  BATCH_MIN,
  batchCost,
  DEFAULT_ASPECT,
  DEFAULT_MODEL,
  MAX_PROMPT_LENGTH,
  MODELS,
  type AspectId,
  type ModelId,
} from "@/lib/credits";

import { CHIP_CLASS, ChipMenu, type ChipOption } from "./chip-menu";
import { requestImprovedPrompt, type ImproveOutcome } from "./improve-prompt";
import type { GenerateRequest } from "./types";

export type ComposerHandle = {
  /** `select` pre-selects a range (e.g. a preset's subject) so the first keystroke replaces it. */
  setPrompt: (prompt: string, select?: [number, number]) => void;
  setSettings: (settings: Partial<Omit<GenerateRequest, "prompt">>) => void;
  focus: () => void;
};

const MAX_TEXTAREA_PX = 110; // 5 lines at 22px
const COUNTER_FROM = MAX_PROMPT_LENGTH * 0.8;
const IMPROVE_ERRORS = {
  IP_LIMIT: "composer.improveLimit",
  TIMEOUT: "composer.improveTimeout",
} as const;

const GLYPH: Record<AspectId, string> = {
  "1:1": "h-3.5 w-3.5",
  "3:4": "h-4 w-3",
  "4:3": "h-3 w-4",
  "9:16": "h-4 w-2.5",
  "16:9": "h-2.5 w-4",
};

const MODEL_IDS = Object.keys(MODELS) as ModelId[];

const ASPECT_OPTIONS: ChipOption<AspectId>[] = (Object.keys(ASPECTS) as AspectId[]).map((id) => ({
  value: id,
  label: id,
  icon: (
    <span className="flex size-4 items-center justify-center">
      <span className={`rounded-[2px] border-[1.5px] border-current ${GLYPH[id]}`} />
    </span>
  ),
}));

type Props = {
  ref: Ref<ComposerHandle>;
  inFlight: boolean;
  /** A blocking rejection (budget, IP limit, paused) happened; the thread explains it and Generate stays off. */
  blocked: boolean;
  onGenerate: (request: GenerateRequest) => Promise<boolean>;
  /** Fixed over scrolling results (/image): a heavier shadow so content reads as passing underneath. */
  docked?: boolean;
};

export function Composer({ ref, inFlight, blocked, onGenerate, docked = false }: Props) {
  const { credits, openAuthModal, showToast } = useApp();
  const t = useT();
  // Model names stay as written; only the one-line description is translated.
  const modelOptions: ChipOption<ModelId>[] = MODEL_IDS.map((id) => ({
    value: id,
    label: MODELS[id].label,
    description: t(`model.${id}.description`),
    meta: (
      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-text-2 tabular-nums">
        <SparkleIcon className="size-3 text-accent" />
        {MODELS[id].credits}
      </span>
    ),
  }));
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [aspect, setAspect] = useState<AspectId>(DEFAULT_ASPECT);
  const [batch, setBatch] = useState(BATCH_MIN);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [improving, setImproving] = useState(false);
  // True while the improved prompt is typed into the textarea.
  const [revealing, setRevealing] = useState(false);
  // What Undo restores. Cleared as soon as the text stops being the improver's output.
  const [original, setOriginal] = useState<string | null>(null);
  const [improveLimited, setImproveLimited] = useState(false);
  const improveAbort = useRef<AbortController | null>(null);
  const revealFrame = useRef<number | null>(null);

  function stopReveal() {
    if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
    revealFrame.current = null;
    setRevealing(false);
  }

  useEffect(
    () => () => {
      improveAbort.current?.abort();
      if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
    },
    [],
  );

  useImperativeHandle(ref, () => ({
    setPrompt: (untrimmed, select) => {
      const next = untrimmed.slice(0, MAX_PROMPT_LENGTH);
      stopReveal();
      setOriginal(null);
      setPrompt(next);
      // After React commits the new value; preventScroll so callers own any scrolling.
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus({ preventScroll: true });
        const [start, end] = select ?? [next.length, next.length];
        el.setSelectionRange(start, end);
      });
    },
    setSettings: (settings) => {
      if (settings.model) setModel(settings.model);
      if (settings.aspect) setAspect(settings.aspect);
      if (settings.batch) setBatch(settings.batch);
    },
    focus: () => textareaRef.current?.focus({ preventScroll: true }),
  }));

  // field-sizing handles auto-grow where supported (Chromium, Safari); this covers Firefox.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || CSS.supports("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [prompt]);

  const cost = batchCost(model, batch);
  const needsCredits = credits !== null && cost.credits > credits;
  const trimmed = prompt.trim();
  const busyImproving = improving || revealing;
  const disabled = inFlight || blocked || busyImproving || (!needsCredits && trimmed === "");
  const canImprove = !inFlight && !busyImproving && !improveLimited && trimmed !== "";
  const improveTitle = improveLimited
    ? t("composer.improveLimit")
    : trimmed === ""
      ? t("composer.improveEmpty")
      : t("composer.improve");

  function focusEnd(length: number) {
    const el = textareaRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(length, length);
  }

  // Types the new prompt in over well under a second, so the swap reads as a rewrite rather than a jump.
  function reveal(text: string) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPrompt(text);
      requestAnimationFrame(() => focusEnd(text.length));
      return;
    }
    const duration = Math.min(900, 300 + text.length * 1.5);
    const startedAt = performance.now();
    setRevealing(true);
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setPrompt(text.slice(0, Math.ceil(text.length * eased)));
      if (progress < 1) {
        revealFrame.current = requestAnimationFrame(step);
      } else {
        revealFrame.current = null;
        setRevealing(false);
        focusEnd(text.length);
      }
    };
    revealFrame.current = requestAnimationFrame(step);
  }

  async function improve() {
    if (!canImprove) return;
    const source = prompt;
    const controller = new AbortController();
    improveAbort.current = controller;
    setImproving(true);
    let outcome: ImproveOutcome;
    try {
      outcome = await requestImprovedPrompt(source.trim(), controller.signal);
    } catch {
      return; // aborted: the composer unmounted
    } finally {
      setImproving(false);
    }
    if (!outcome.ok) {
      if (outcome.code === "IP_LIMIT") setImproveLimited(true);
      const key = outcome.code in IMPROVE_ERRORS
        ? IMPROVE_ERRORS[outcome.code as keyof typeof IMPROVE_ERRORS]
        : "composer.improveFailed";
      showToast({ tone: "danger", text: t(key) });
      return;
    }
    setOriginal(source);
    reveal(outcome.prompt.slice(0, MAX_PROMPT_LENGTH));
  }

  function undo() {
    if (original === null) return;
    stopReveal();
    setPrompt(original);
    setOriginal(null);
    requestAnimationFrame(() => focusEnd(original.length));
  }

  function submit() {
    if (disabled) return;
    if (needsCredits) {
      openAuthModal("out-of-credits");
      return;
    }
    setOriginal(null);
    void onGenerate({ prompt: trimmed, model, aspect, batch }).then((ok) => {
      // Clear only if the user hasn't started typing the next prompt while this one ran.
      if (ok) setPrompt((current) => (current.trim() === trimmed ? "" : current));
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={`relative grid gap-3 rounded-2xl border bg-bg-2 p-3 sm:grid-cols-[1fr_auto] ${docked ? "shadow-dock" : "shadow-float"} sm:gap-4 sm:p-5 ${
        inFlight ? "border-accent/30 motion-safe:animate-pulse-border" : "border-border-2"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            disabled={inFlight}
            aria-label={t("composer.addReference")}
            onClick={() => showToast({ tone: "neutral", text: t("composer.referenceSoon") })}
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-bg-3 text-text-1 transition-colors duration-150 hover:bg-bg-5 disabled:pointer-events-none disabled:opacity-50"
          >
            <PlusIcon className="size-4" />
          </button>
          <button
            type="button"
            disabled={!canImprove}
            aria-label={t("composer.improve")}
            aria-busy={improving}
            title={improveTitle}
            onClick={() => void improve()}
            className={`group relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-3 text-text-1 transition-colors duration-150 hover:bg-bg-5 ${
              busyImproving ? "" : "disabled:opacity-50"
            }`}
          >
            {improving && (
              <>
                {/* A brand-colored ring orbiting the button edge; the inner plate masks all but 1.5px of it. */}
                <span aria-hidden className="absolute -inset-2 bg-brand-conic motion-safe:animate-orbit" />
                <span aria-hidden className="absolute inset-[1.5px] rounded-[8.5px] bg-bg-3" />
              </>
            )}
            {busyImproving ? (
              <SparkleIcon gradient className="relative size-4 motion-safe:animate-breathe" />
            ) : (
              <WandIcon className="relative size-4 transition-[rotate,color] duration-200 group-enabled:group-hover:text-accent motion-safe:group-enabled:group-hover:-rotate-12" />
            )}
          </button>
          <label htmlFor="prompt" className="sr-only">
            {t("composer.prompt")}
          </label>
          <div className="relative flex min-w-0 flex-1">
            <textarea
              id="prompt"
              ref={textareaRef}
              value={prompt}
              readOnly={busyImproving}
              aria-busy={busyImproving}
              onChange={(e) => {
                setPrompt(e.target.value);
                setOriginal(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              onPaste={(e) => {
                const el = e.currentTarget;
                const replaced = el.selectionEnd - el.selectionStart;
                const after = el.value.length - replaced + e.clipboardData.getData("text").length;
                // maxLength cuts the paste silently; say so, or the missing tail looks like a bug.
                if (after > MAX_PROMPT_LENGTH) {
                  showToast({
                    tone: "neutral",
                    text: t("composer.trimmed", { n: MAX_PROMPT_LENGTH }),
                  });
                }
              }}
              rows={1}
              maxLength={MAX_PROMPT_LENGTH}
              aria-describedby={prompt.length >= COUNTER_FROM ? "prompt-count" : undefined}
              placeholder={t("composer.placeholder")}
              className={`field-sizing-content max-h-27.5 min-h-8 flex-1 resize-none bg-transparent py-1.25 text-[15px] leading-5.5 text-text-1 outline-none transition-opacity duration-200 placeholder:text-text-placeholder ${
                improving ? "opacity-40" : ""
              }`}
            />
            {improving && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-sm shimmer-brand motion-safe:animate-shimmer-fast motion-reduce:hidden"
              />
            )}
          </div>
          {prompt.length >= COUNTER_FROM && (
            <span
              id="prompt-count"
              className={`shrink-0 self-end pb-1.5 text-xs font-medium tabular-nums ${
                prompt.length >= MAX_PROMPT_LENGTH ? "text-danger" : "text-text-3"
              }`}
            >
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </span>
          )}
        </div>

        <span className="sr-only" aria-live="polite">
          {improving ? t("composer.improving") : original !== null ? t("composer.improved") : ""}
        </span>

        <div className="-mx-3 flex gap-2 overflow-x-auto overscroll-x-contain pl-3 scrollbar-none sm:mx-0 sm:overflow-visible sm:pl-0">
          {original !== null && (
            <button
              type="button"
              onClick={undo}
              disabled={revealing}
              className={`${CHIP_CLASS} border-accent/40 motion-safe:animate-pop-in`}
            >
              <SparkleIcon gradient className="size-3.5" />
              <span className="text-text-2">{t("composer.improved")}</span>
              <span aria-hidden className="h-3.5 w-px bg-border-3" />
              <ReuseIcon className="size-3.5" />
              {t("composer.undo")}
              <span className="sr-only">{t("composer.undoSr")}</span>
            </button>
          )}
          <ChipMenu
            label={t("composer.model")}
            icon={<SparkleIcon gradient />}
            options={modelOptions}
            value={model}
            onChange={setModel}
            disabled={inFlight}
          />
          <ChipMenu
            label={t("composer.aspect")}
            icon={<AspectIcon />}
            options={ASPECT_OPTIONS}
            value={aspect}
            onChange={setAspect}
            disabled={inFlight}
          />
          <div
            role="group"
            aria-label={t("composer.count")}
            className={`${CHIP_CLASS} gap-1 px-1.5 hover:bg-chip ${inFlight ? "pointer-events-none opacity-50" : ""}`}
          >
            <button
              type="button"
              aria-label={t("composer.fewer")}
              disabled={inFlight || batch <= BATCH_MIN}
              onClick={() => setBatch((b) => Math.max(BATCH_MIN, b - 1))}
              className="flex size-7 items-center justify-center rounded-sm text-text-2 transition-colors duration-150 hover:bg-bg-5 hover:text-text-1 disabled:text-text-disabled disabled:hover:bg-transparent"
            >
              <MinusIcon className="size-3.5" />
            </button>
            <span className="min-w-7 text-center tabular-nums" aria-live="polite">
              {batch}/{BATCH_MAX}
            </span>
            <button
              type="button"
              aria-label={t("composer.more")}
              disabled={inFlight || batch >= BATCH_MAX}
              onClick={() => setBatch((b) => Math.min(BATCH_MAX, b + 1))}
              className="flex size-7 items-center justify-center rounded-sm text-text-2 transition-colors duration-150 hover:bg-bg-5 hover:text-text-1 disabled:text-text-disabled disabled:hover:bg-transparent"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>
          {/* Fades chips out at the right edge so the row reads as scrollable, and doubles as its end padding.
              Not a mask on the row: that would also fade the chip menus, which render inside it. */}
          <span
            aria-hidden
            className="pointer-events-none sticky right-0 -ml-2 w-10 shrink-0 bg-linear-to-l from-bg-2 to-transparent sm:hidden"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="flex h-13 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-5 text-base font-semibold whitespace-nowrap text-accent-ink inset-shadow-lip shadow-brand-glow-soft transition-[filter,translate,box-shadow] duration-150 enabled:hover:shadow-brand-glow enabled:hover:brightness-110 enabled:motion-safe:hover:-translate-y-0.5 enabled:active:translate-y-px enabled:active:inset-shadow-lip-pressed disabled:bg-brand-gradient-muted disabled:text-accent-ink/70 disabled:shadow-none disabled:inset-shadow-none sm:h-20.5 sm:w-43.5"
      >
        {inFlight ? (
          <>
            <SpinnerIcon className="size-4 motion-safe:animate-spin" />
            {t("composer.generating")}
          </>
        ) : needsCredits ? (
          t("composer.getCredits")
        ) : (
          <>
            {t("composer.generate")}
            <SparkleIcon className="size-3.5" />
            <span className="tabular-nums">
              <s aria-hidden className="font-semibold opacity-50">{cost.listCredits}</s>{" "}
              <span className="font-bold">{cost.credits}</span>
              <span className="sr-only">{t("composer.creditsSr")}</span>
            </span>
          </>
        )}
      </button>
    </form>
  );
}
