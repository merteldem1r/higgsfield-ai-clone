"use client";

import { useState } from "react";

import { ReuseIcon } from "@/components/icons";
import { useLocale } from "@/components/locale-provider";
import { batchCost, MODELS } from "@/lib/credits";

import { failureLine, followUps, pendingLine } from "./assistant-lines";
import { RunMedia } from "./run-media";
import type { GenerateRequest, Run, RunImage } from "./types";

const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

const ACTION =
  "flex h-8 items-center gap-1.5 rounded-md bg-bg-2 px-3 text-xs font-medium text-text-1 transition-colors duration-150 hover:bg-bg-3 disabled:text-text-disabled disabled:hover:bg-bg-2";

// One run as a frame: the image at the column's width, a caption row with the prompt and the facts, then the
// actions. The voice speaks only while the run is live and when it fails.
export function RunFrame({
  run,
  newest,
  onLoad,
  onOpen,
  onFavourite,
  onRetry,
  retryDisabled,
}: {
  run: Run;
  /** The newest run also carries the three variations. */
  newest: boolean;
  onLoad: (request: GenerateRequest) => void;
  onOpen: (image: RunImage) => void;
  onFavourite: (image: RunImage, favourite: boolean) => void;
  onRetry: () => void;
  retryDisabled: boolean;
}) {
  const { locale, t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const { prompt, model, aspect, batch } = run.request;
  const time = new Intl.DateTimeFormat(locale, TIME).format(run.startedAt);
  const seconds = run.completedAt ? `${Math.max((run.completedAt - run.startedAt) / 1000, 0.1).toFixed(1)}s` : null;
  const cost = batchCost(model, batch).credits;
  const failed = failureLine(run, locale, t);

  // A failed run that was retried: the retry sits right above, so this stays as a one-line record.
  if (run.status === "failed" && run.retried) {
    return (
      <article aria-label={prompt} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-text-2">
        <time dateTime={new Date(run.startedAt).toISOString()} className="text-xs text-text-3 tabular-nums">
          {time}
        </time>
        <p>{failed}</p>
      </article>
    );
  }

  return (
    <article aria-label={prompt} className="flex flex-col gap-3">
      <RunMedia
        run={run}
        onOpen={onOpen}
        onFavourite={onFavourite}
        onRetry={onRetry}
        retryDisabled={retryDisabled}
        failureLine={failed}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          title={expanded ? undefined : prompt}
          className={`min-w-0 text-left text-sm leading-5 text-text-1 wrap-break-word whitespace-pre-wrap ${
            expanded ? "" : "line-clamp-2"
          }`}
        >
          {prompt}
        </button>
        <dl className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-text-2 tabular-nums">
          <Fact label={t("run.time")}>
            <time dateTime={new Date(run.startedAt).toISOString()} className="text-text-3">
              {time}
            </time>
          </Fact>
          {run.status === "pending" ? (
            <Fact label={t("run.status")}>
              <span aria-live="polite">{pendingLine(run, locale, t)}</span>
            </Fact>
          ) : (
            <>
              <Fact label={t("composer.model")}>{MODELS[model].label}</Fact>
              <Fact label={t("composer.aspect")}>{aspect}</Fact>
              {run.status === "done" && seconds && <Fact label={t("run.took")}>{seconds}</Fact>}
              {run.status === "done" && <Fact label={t("run.cost")}>{t("credits.count", { n: cost })}</Fact>}
            </>
          )}
        </dl>
      </div>

      {run.status !== "pending" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onLoad(run.request)} title={t("thread.reuseTitle")} className={ACTION}>
            <ReuseIcon className="size-3.5" />
            {t("thread.reuse")}
          </button>
          {newest &&
            run.status === "done" &&
            followUps(run.request, t).map((f) => (
              <button key={f.label} type="button" onClick={() => onLoad(f.request)} className={ACTION}>
                {f.label}
                <span className="text-text-2 tabular-nums">{f.cost}</span>
              </button>
            ))}
        </div>
      )}
    </article>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-1">
      <dt className="sr-only">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
