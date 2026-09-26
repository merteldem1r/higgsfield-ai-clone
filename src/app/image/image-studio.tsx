"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useApp } from "@/components/app-provider";
import { Composer, type ComposerHandle } from "@/components/composer/composer";
import {
  FOCUS_COMPOSER_EVENT,
  FOCUS_PARAM,
  takeStashedDraft,
  takeStashedGeneration,
} from "@/components/composer/handoff";
import { useFavourite } from "@/components/favourite-button";
import { AlertIcon, ChevronUpIcon, SparkleIcon } from "@/components/icons";
import { useLocale } from "@/components/locale-provider";
import { MadeHereGrid } from "@/components/made-here-grid";
import { PresetStrip } from "@/components/preset-strip";
import { DEFAULT_ASPECT, FREE_CREDITS, isAspectId, isModelId, UPGRADE_BONUS } from "@/lib/credits";
import type { MessageKey } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

import { AmbientBackground } from "./ambient-background";
import { rejectionLine } from "./assistant-lines";
import { requestGeneration } from "./request-generation";
import { RunList } from "./run-list";
import type { GenerateRequest, Rejection, Run } from "./types";

const BUCKET = "generations";
const HISTORY_LIMIT = 40;

// Rejections that will fail again for everyone on this network/deployment until something changes, so the
// composer locks after one. The notice explains why.
const BLOCKING = new Set(["GLOBAL_CAP", "IP_LIMIT", "FAL_DISABLED"]);
// Rejections the visitor can simply retry. The others (budget, IP limit) can't succeed today.
const RETRYABLE = new Set(["FAL_DISABLED", "NETWORK", "UNKNOWN", "INTERNAL", "INVALID_INPUT"]);

// Labels are translated; the prompts they load stay in English, like any prompt.
const STARTERS: { label: MessageKey; prompt: string }[] = [
  { label: "image.starter.lighthouse", prompt: "a lone lighthouse on a sea cliff under a starry sky, milky way, long exposure" },
  { label: "image.starter.alley", prompt: "a neon-lit rainy alley in Tokyo at night, empty, reflections on wet pavement, cinematic wide shot" },
  { label: "image.starter.glass", prompt: "a modern glass house in a snowy pine forest at blue hour, warm interior lights glowing" },
];

type HistoryRow = {
  id: string;
  prompt: string;
  model: string;
  aspect: string;
  batch: number;
  created_at: string;
  completed_at: string | null;
  assets: { id: string; storage_path: string; width: number | null; height: number | null; favourite: boolean }[];
};

async function loadHistory(): Promise<Run[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return [];

  const { data, error } = await supabase
    .from("generations")
    .select("id, prompt, model, aspect, batch, created_at, completed_at, assets(id, storage_path, width, height, favourite)")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;

  return (data as HistoryRow[]).flatMap((row): Run[] => {
    if (!isModelId(row.model) || row.assets.length === 0) return [];
    return [
      {
        id: row.id,
        request: {
          prompt: row.prompt,
          model: row.model,
          aspect: isAspectId(row.aspect) ? row.aspect : DEFAULT_ASPECT,
          batch: row.batch,
        },
        status: "done",
        live: false,
        startedAt: Date.parse(row.created_at),
        completedAt: row.completed_at ? Date.parse(row.completed_at) : undefined,
        images: row.assets
          .toSorted((a, b) => a.storage_path.localeCompare(b.storage_path))
          .map((asset) => ({
            id: asset.id,
            url: supabase.storage.from(BUCKET).getPublicUrl(asset.storage_path).data.publicUrl,
            width: asset.width,
            height: asset.height,
            favourite: asset.favourite,
          })),
      },
    ];
  });
}

export function ImageStudio() {
  const router = useRouter();
  const { account, refreshCredits, setCredits, openAuthModal } = useApp();
  const { locale, t } = useLocale();
  const [runs, setRuns] = useState<Run[]>([]);
  const [inFlight, setInFlight] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [rejection, setRejection] = useState<Rejection | null>(null);
  // The refs are the real locks: state updates are async, so a double click could slip past `inFlight`.
  const lock = useRef(false);
  const blockedRef = useRef(false);
  const composerRef = useRef<ComposerHandle>(null);
  const topRef = useRef<HTMLDivElement>(null);
  // True once the composer has scrolled out of view; the floating "back" pill shows only then.
  const [composerAway, setComposerAway] = useState(false);
  // The arrival effect below runs once, so it calls generate through this ref to get the current one.
  const latestGenerate = useRef<((request: GenerateRequest) => Promise<boolean>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadHistory()
      .then((history) => {
        if (cancelled) return;
        // runs is newest-first; runs started before history arrived stay the newest.
        setRuns((current) => [...current, ...history.filter((h) => !current.some((c) => c.id === h.id))]);
      })
      .catch((err) => console.error("Loading history failed", err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setComposerAway(!entry.isIntersecting), { rootMargin: "-56px 0px 0px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const setFavourite = useFavourite((assetId, favourite) =>
    setRuns((current) =>
      current.map((run) =>
        run.images.some((image) => image.id === assetId)
          ? { ...run, images: run.images.map((image) => (image.id === assetId ? { ...image, favourite } : image)) }
          : run,
      ),
    ),
  );

  const updateRun = (id: string, patch: Partial<Run>) =>
    setRuns((current) => current.map((run) => (run.id === id ? { ...run, ...patch } : run)));

  // The composer and the newest frame live at the top; a run started from further down brings them into view.
  function scrollToTop() {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    topRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }

  async function generate(request: GenerateRequest): Promise<boolean> {
    if (lock.current || blockedRef.current) return false;
    lock.current = true;
    setInFlight(true);
    setRejection(null);

    // The frame goes up before sign-in or the API: the first generation is the slowest path in the app.
    const id = crypto.randomUUID();
    setRuns((current) => [{ id, request, status: "pending", live: true, startedAt: Date.now(), images: [] }, ...current]);
    scrollToTop();

    try {
      const outcome = await requestGeneration(request);
      if (outcome.ok) {
        updateRun(id, { status: "done", images: outcome.images, completedAt: Date.now() });
        setCredits(outcome.credits);
        return true;
      }

      const { code, message } = outcome;
      if (code === "PROVIDER_ERROR") {
        // Charged and refunded: a real run, so it stays in the sheet as a failed frame.
        updateRun(id, { status: "failed", completedAt: Date.now() });
        return false;
      }

      // Every other code was rejected before any spend. It isn't a run: the frame goes and the composer explains.
      setRuns((current) => current.filter((run) => run.id !== id));
      setRejection({ code, message, request });
      if (code === "INSUFFICIENT_CREDITS") {
        openAuthModal("out-of-credits");
        void refreshCredits();
      }
      if (BLOCKING.has(code)) {
        blockedRef.current = true;
        setBlocked(true);
      }
      return false;
    } catch (err) {
      console.error("Generation request failed", err);
      setRuns((current) => current.filter((run) => run.id !== id));
      setRejection({ code: "NETWORK", message: err instanceof Error ? err.message : String(err), request });
      return false;
    } finally {
      lock.current = false;
      setInFlight(false);
    }
  }

  useEffect(() => {
    latestGenerate.current = generate;
  });

  // Arrivals from /: ?model=… preselects the chip, and a Generate click made on / starts here at once.
  // Must stay below the effect above, which is what fills latestGenerate on the first commit.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const model = params.get("model");
    if (isModelId(model)) composerRef.current?.setSettings({ model });

    // Dropped from the URL so a refresh doesn't refocus.
    if (params.has(FOCUS_PARAM)) {
      composerRef.current?.focus();
      params.delete(FOCUS_PARAM);
      const query = params.toString();
      window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    }

    // A Reuse from the gallery, community or prompter: fill the composer and stop there. Only a click on Generate spends.
    const draft = takeStashedDraft();
    if (draft) {
      const { prompt, select, ...settings } = draft;
      composerRef.current?.setSettings(settings);
      composerRef.current?.setPrompt(prompt, select);
    }

    const stashed = takeStashedGeneration();
    if (!stashed) return;
    composerRef.current?.setSettings({ model: stashed.model, aspect: stashed.aspect, batch: stashed.batch });
    void latestGenerate.current?.(stashed);
  }, []);

  useEffect(() => {
    const focus = () => composerRef.current?.focus();
    window.addEventListener(FOCUS_COMPOSER_EVENT, focus);
    return () => window.removeEventListener(FOCUS_COMPOSER_EVENT, focus);
  }, []);

  // A pause is the one block a retry is meant to probe; the server says again if it's still on.
  function unblockIfPaused(code: string | undefined) {
    if (code !== "FAL_DISABLED") return;
    blockedRef.current = false;
    setBlocked(false);
  }

  // The failed frame stays as a record and collapses; the retry is a new run above it.
  function retryRun(run: Run) {
    updateRun(run.id, { retried: true });
    void generate(run.request);
  }

  function retryRejected() {
    if (!rejection) return;
    unblockIfPaused(rejection.code);
    void generate(rejection.request);
  }

  function loadIntoComposer({ prompt, ...settings }: GenerateRequest, select?: [number, number]) {
    composerRef.current?.setSettings(settings);
    composerRef.current?.setPrompt(prompt, select);
    scrollToTop();
  }

  const member = account?.status === "member";
  const notice = rejection && (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-bg-2 px-3 py-2.5 text-sm">
      <AlertIcon className={`size-4 shrink-0 ${BLOCKING.has(rejection.code) ? "text-text-2" : "text-danger"}`} />
      <p className="min-w-0 flex-1 text-text-1">
        {rejectionLine(rejection.code, rejection.message, rejection.request, locale, t, member)}
      </p>
      {rejection.code === "INSUFFICIENT_CREDITS" && (
        <button
          type="button"
          onClick={() => (member ? router.push("/pricing") : openAuthModal("signup"))}
          className="shrink-0 font-medium text-accent-text transition-colors duration-150 hover:text-text-1"
        >
          {member ? t("thread.seePlans") : t("thread.signUpFor", { n: UPGRADE_BONUS })}
        </button>
      )}
      {RETRYABLE.has(rejection.code) && (
        <button
          type="button"
          onClick={retryRejected}
          disabled={inFlight}
          className="shrink-0 font-medium text-accent-text transition-colors duration-150 hover:text-text-1 disabled:text-text-disabled"
        >
          {t("thread.tryAgain")}
        </button>
      )}
    </div>
  );

  return (
    <>
      <AmbientBackground active={inFlight} />
      <main className="mx-auto flex w-full max-w-[calc(880px+2rem)] flex-1 flex-col px-4 pt-6 pb-24">
        <div ref={topRef} className="scroll-mt-20">
          <Composer
            ref={composerRef}
            inFlight={inFlight}
            blocked={blocked}
            onGenerate={generate}
            notice={notice}
            onEdit={() => {
              if (rejection && !BLOCKING.has(rejection.code)) setRejection(null);
            }}
          />
        </div>

        {runs.length === 0 ? (
          <div className="mt-6 flex flex-col gap-12">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-2">{t("image.empty", { n: FREE_CREDITS })}</p>
              <ul aria-label={t("image.starters")} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {STARTERS.map((starter) => (
                  <li key={starter.label}>
                    <button
                      type="button"
                      onClick={() => composerRef.current?.setPrompt(starter.prompt)}
                      className="rounded-sm text-text-1 underline decoration-line-2 underline-offset-4 transition-colors duration-150 hover:decoration-text-2"
                    >
                      {t(starter.label)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <section aria-labelledby="presets-title" className="flex flex-col gap-4">
              <h2 id="presets-title" className="text-h3 font-medium">
                {t("home.presetsTitle")}
              </h2>
              <PresetStrip onPick={(prompt, select) => loadIntoComposer({ prompt, model: "flux-schnell", aspect: DEFAULT_ASPECT, batch: 1 }, select)} />
            </section>
            <section aria-labelledby="made-title" className="flex flex-col gap-4">
              <h2 id="made-title" className="text-h3 font-medium">
                {t("home.showcaseTitle")}
              </h2>
              <MadeHereGrid onRecreate={(prompt, { aspect }) => loadIntoComposer({ prompt, model: "flux-dev", aspect, batch: 1 })} />
            </section>
          </div>
        ) : (
          <div className="mt-10 flex flex-col">
            <RunList
              runs={runs}
              onLoad={(request) => loadIntoComposer(request)}
              onRetry={retryRun}
              onFavourite={(image, favourite) => {
                if (image.id) void setFavourite(image.id, favourite, image.favourite);
              }}
              retryDisabled={inFlight || blocked}
            />
          </div>
        )}
      </main>

      {/* Floating way back to the composer from deep in a long sheet. Rises in when the composer leaves the viewport. */}
      {composerAway && runs.length > 0 && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed right-4 bottom-6 z-30 flex h-10 items-center gap-2 rounded-full bg-bg-1 pr-4 pl-3 text-sm font-medium text-text-1 shadow-float ring-1 ring-line-2 transition-colors duration-150 hover:bg-bg-2 motion-safe:animate-rise-in motion-reduce:animate-fade-in sm:right-6"
        >
          <SparkleIcon gradient className="size-4" />
          {t("image.backToComposer")}
          <ChevronUpIcon className="size-3.5 text-text-2" />
        </button>
      )}
    </>
  );
}
