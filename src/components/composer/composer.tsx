"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";

import { useApp } from "@/components/app-provider";
import { DotMeter } from "@/components/dot-meter";
import { AspectIcon, MinusIcon, PlusIcon, SparkleIcon, SpinnerIcon, WandIcon } from "@/components/icons";
import { useT } from "@/components/locale-provider";
import {
  ASPECTS,
  BATCH_MAX,
  BATCH_MIN,
  batchCost,
  DEFAULT_ASPECT,
  DEFAULT_MODEL,
  FREE_CREDITS,
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

const MAX_TEXTAREA_PX = 240; // 10 lines at 24px
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

const TEXTAREA =
  "field-sizing-content max-h-60 min-h-18 w-full resize-none text-base leading-6 wrap-break-word whitespace-pre-wrap";

const STEP =
  "flex size-7 items-center justify-center rounded-sm text-text-2 transition-colors duration-150 hover:bg-bg-3 hover:text-text-1 disabled:text-text-disabled disabled:hover:bg-transparent";

type Props = {
  ref: Ref<ComposerHandle>;
  inFlight: boolean;
  /** A blocking rejection (budget, IP limit, paused) happened; the notice explains it and Generate stays off. */
  blocked: boolean;
  onGenerate: (request: GenerateRequest) => Promise<boolean>;
  /** A rejection or lock, rendered under the prompt with its action. Cleared by the caller. */
  notice?: ReactNode;
  /** Called when the visitor edits the prompt, so a stale notice can be cleared. */
  onEdit?: () => void;
};

export function Composer({ ref, inFlight, blocked, onGenerate, notice, onEdit }: Props) {
  const { credits, openAuthModal, showToast } = useApp();
  const t = useT();
  // Model names stay as written; only the one-line description is translated.
  const modelOptions: ChipOption<ModelId>[] = MODEL_IDS.map((id) => ({
    value: id,
    label: MODELS[id].label,
    description: t(`model.${id}.description`),
    meta: <span className="shrink-0 text-xs text-text-2 tabular-nums">{MODELS[id].credits}</span>,
  }));
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [aspect, setAspect] = useState<AspectId>(DEFAULT_ASPECT);
  const [batch, setBatch] = useState(BATCH_MIN);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [improving, setImproving] = useState(false);
  // What Undo restores. Cleared as soon as the text stops being the improver's output.
  const [original, setOriginal] = useState<string | null>(null);
  const [improveLimited, setImproveLimited] = useState(false);
  const improveAbort = useRef<AbortController | null>(null);

  useEffect(() => () => improveAbort.current?.abort(), []);

  useImperativeHandle(ref, () => ({
    setPrompt: (untrimmed, select) => {
      const next = untrimmed.slice(0, MAX_PROMPT_LENGTH);
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
  const disabled = inFlight || blocked || improving || (!needsCredits && trimmed === "");
  const canImprove = !inFlight && !improving && !improveLimited && trimmed !== "";
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
    // The rewrite arrives whole, so it's shown whole: the dimmed textarea fading back is the only motion.
    const next = outcome.prompt.slice(0, MAX_PROMPT_LENGTH);
    setOriginal(source);
    setPrompt(next);
    requestAnimationFrame(() => focusEnd(next.length));
  }

  function undo() {
    if (original === null) return;
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
      className="flex flex-col gap-3 rounded-xl bg-bg-1 p-4 ring-1 ring-line-2"
    >
      <label htmlFor="prompt" className="sr-only">
        {t("composer.prompt")}
      </label>
      <div className="relative">
        <textarea
          id="prompt"
          ref={textareaRef}
          value={prompt}
          readOnly={improving}
          aria-busy={improving}
          onChange={(e) => {
            setPrompt(e.target.value);
            setOriginal(null);
            onEdit?.();
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
              showToast({ tone: "neutral", text: t("composer.trimmed", { n: MAX_PROMPT_LENGTH }) });
            }
          }}
          rows={3}
          maxLength={MAX_PROMPT_LENGTH}
          aria-describedby={prompt.length >= COUNTER_FROM ? "prompt-count" : undefined}
          placeholder={t("composer.placeholder")}
          className={`${TEXTAREA} bg-transparent text-text-1 outline-none transition-colors duration-200 placeholder:text-text-placeholder ${
            improving ? "text-transparent" : ""
          }`}
        />
        {/* While the rewrite is in flight the words themselves carry the motion: a mirror of the text, laid over
            the (now transparent) textarea, with a brand band sweeping through it. Static grey under reduced motion. */}
        {improving && (
          <div
            aria-hidden
            className={`${TEXTAREA} pointer-events-none absolute inset-0 overflow-hidden text-sweep motion-safe:animate-sweep`}
          >
            {prompt}
          </div>
        )}
      </div>

      {(original !== null || prompt.length >= COUNTER_FROM || improving) && (
        <div className="-mt-1 flex items-center gap-3 text-xs text-text-2">
          <span className="sr-only" aria-live="polite">
            {improving ? t("composer.improving") : original !== null ? t("composer.improved") : ""}
          </span>
          {improving && <span aria-hidden>{t("composer.improving")}</span>}
          {/* A second rewrite in flight hides the previous Undo: it would restore text the new result is about to replace. */}
          {original !== null && !improving && (
            <>
              <span aria-hidden>{t("composer.improved")}</span>
              <button
                type="button"
                onClick={undo}
                className="font-medium text-text-1 transition-colors duration-150 hover:text-accent-text"
              >
                {t("composer.undo")}
                <span className="sr-only"> {t("composer.undoSr")}</span>
              </button>
            </>
          )}
          {prompt.length >= COUNTER_FROM && (
            <span
              id="prompt-count"
              className={`ml-auto tabular-nums ${prompt.length >= MAX_PROMPT_LENGTH ? "text-danger" : "text-text-3"}`}
            >
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </span>
          )}
        </div>
      )}

      {notice}

      <div className="flex flex-wrap items-center gap-2">
        <ChipMenu
          label={t("composer.model")}
          icon={<SparkleIcon />}
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
          className={`${CHIP_CLASS} gap-1 px-1.5 hover:bg-bg-2 ${inFlight ? "pointer-events-none opacity-50" : ""}`}
        >
          <button
            type="button"
            aria-label={t("composer.fewer")}
            disabled={inFlight || batch <= BATCH_MIN}
            onClick={() => setBatch((b) => Math.max(BATCH_MIN, b - 1))}
            className={STEP}
          >
            <MinusIcon className="size-3.5" />
          </button>
          <span className="min-w-16 text-center tabular-nums" aria-live="polite">
            {t("composer.images", { n: batch })}
          </span>
          <button
            type="button"
            aria-label={t("composer.more")}
            disabled={inFlight || batch >= BATCH_MAX}
            onClick={() => setBatch((b) => Math.min(BATCH_MAX, b + 1))}
            className={STEP}
          >
            <PlusIcon className="size-3.5" />
          </button>
        </div>

        <button
          type="button"
          disabled={!canImprove}
          aria-label={t("composer.improve")}
          aria-busy={improving}
          title={improveTitle}
          onClick={() => void improve()}
          className="relative ml-auto flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-2 text-text-1 transition-colors duration-150 hover:bg-bg-3 disabled:opacity-50"
        >
          {improving && (
            <>
              {/* A brand ring orbiting the button's edge; the inner plate masks all but 1.5px of it. */}
              <span aria-hidden className="absolute -inset-2 bg-brand-conic motion-safe:animate-orbit" />
              <span aria-hidden className="absolute inset-[1.5px] rounded-[6.5px] bg-bg-2" />
            </>
          )}
          <WandIcon className={`relative size-4 ${improving ? "motion-safe:animate-breathe" : ""}`} />
        </button>

        <button
          type="submit"
          disabled={disabled}
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-brand-gradient px-4 text-sm font-semibold whitespace-nowrap text-accent-ink transition-[filter] duration-150 enabled:hover:brightness-110 disabled:bg-brand-gradient-muted disabled:text-accent-ink/70 max-sm:w-full"
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
              <span className="font-medium tabular-nums opacity-80">{t("credits.count", { n: cost.credits })}</span>
            </>
          )}
        </button>
      </div>

      {/* The balance where the spend is felt: the dots tick down when the server confirms a run. */}
      <div className="flex items-center gap-3 text-xs text-text-2">
        <span className="tabular-nums">{credits === null ? t("credits.label") : t("credits.count", { n: credits })}</span>
        <DotMeter value={credits ?? FREE_CREDITS} className="w-full max-w-60" />
      </div>
    </form>
  );
}
