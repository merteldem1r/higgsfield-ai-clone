"use client";

import { useState } from "react";

import { Lightbox } from "@/components/lightbox";
import { useLocale } from "@/components/locale-provider";

import { RunFrame } from "./run-frame";
import type { GenerateRequest, Run, RunImage } from "./types";

const PAGE = 8;
const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };

type Props = {
  /** Newest first. */
  runs: Run[];
  onLoad: (request: GenerateRequest) => void;
  onRetry: (run: Run) => void;
  onFavourite: (image: RunImage, favourite: boolean) => void;
  retryDisabled: boolean;
};

// Runs newest-first under the composer, with a rule between days. The first page renders; the rest is one
// click away, so a long history doesn't load forty images at once.
export function RunList({ runs, onLoad, onRetry, onFavourite, retryDisabled }: Props) {
  const [shown, setShown] = useState(PAGE);
  const [lightbox, setLightbox] = useState<{ runId: string; url: string } | null>(null);
  const { locale, t } = useLocale();

  // A reference, not a snapshot, so a heart clicked inside the lightbox shows the live value.
  const lightboxRun = lightbox ? runs.find((run) => run.id === lightbox.runId) : undefined;
  const lightboxImage = lightboxRun?.images.find((image) => image.url === lightbox?.url);

  const visible = runs.slice(0, shown);
  const hidden = runs.length - visible.length;

  return (
    <>
      <ol aria-label={t("thread.label")} className="flex flex-col gap-10">
        {visible.map((run, i) => {
          const day = dayLabel(run.startedAt, locale, t);
          const previous = i > 0 ? dayLabel(visible[i - 1].startedAt, locale, t) : null;
          return (
            <li key={run.id} className="flex flex-col gap-10">
              {day !== previous && (
                <div className="flex items-center gap-4 text-xs text-text-3">
                  <span>{day}</span>
                  <span aria-hidden className="h-px flex-1 bg-line-1" />
                </div>
              )}
              <RunFrame
                run={run}
                newest={i === 0}
                onLoad={onLoad}
                onOpen={(image) => setLightbox({ runId: run.id, url: image.url })}
                onFavourite={onFavourite}
                onRetry={() => onRetry(run)}
                retryDisabled={retryDisabled}
              />
            </li>
          );
        })}
      </ol>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mt-10 flex h-9 items-center self-start rounded-md bg-bg-2 px-3.5 text-sm font-medium text-text-1 transition-colors duration-150 hover:bg-bg-3"
        >
          {t("thread.showEarlier", { n: hidden })}
        </button>
      )}

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

function dayLabel(at: number, locale: string, t: (key: "thread.today" | "thread.yesterday") => string): string {
  const day = new Date(at);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(day)) / 86_400_000);
  if (diff === 0) return t("thread.today");
  if (diff === 1) return t("thread.yesterday");
  return new Intl.DateTimeFormat(locale, DATE).format(day);
}
