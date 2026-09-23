"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useApp } from "@/components/app-provider";
import { Composer, type ComposerHandle } from "@/components/composer/composer";
import {
  FOCUS_COMPOSER_EVENT,
  FOCUS_PARAM,
  takeStashedDraft,
  takeStashedGeneration,
} from "@/components/composer/handoff";
import { useFavourite } from "@/components/favourite-button";
import { SparkleIcon } from "@/components/icons";
import { useT } from "@/components/locale-provider";
import { DEFAULT_ASPECT, isAspectId, isModelId } from "@/lib/credits";
import type { MessageKey } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

import { AmbientBackground } from "./ambient-background";
import { ChatThread } from "./chat-thread";
import { requestGeneration } from "./request-generation";
import type { GenerateRequest, Run } from "./types";

const BUCKET = "generations";
const HISTORY_LIMIT = 40;

// Rejections that will fail again for everyone on this network/deployment until something changes, so the
// composer locks after one. The assistant explains why in the thread (assistant-lines.ts).
const BLOCKING = new Set(["GLOBAL_CAP", "IP_LIMIT", "FAL_DISABLED"]);

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

export function ImageStudio({ hero }: { hero: ReactNode }) {
  const { refreshCredits, setCredits, openAuthModal } = useApp();
  const t = useT();
  const [runs, setRuns] = useState<Run[]>([]);
  const [inFlight, setInFlight] = useState(false);
  const [blocked, setBlocked] = useState(false);
  // The refs are the real locks: state updates are async, so a double click could slip past `inFlight`.
  const lock = useRef(false);
  const blockedRef = useRef(false);
  const composerRef = useRef<ComposerHandle>(null);
  // Set before a runs update that should end with the page scrolled to the newest run (the bottom).
  const scrollToNewest = useRef<ScrollBehavior | null>(null);
  // The arrival effect below runs once, so it calls generate through this ref to get the current one.
  const latestGenerate = useRef<((request: GenerateRequest) => Promise<boolean>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadHistory()
      .then((history) => {
        if (cancelled) return;
        if (history.length > 0) scrollToNewest.current = "instant";
        // runs is newest-first; runs started before history arrived stay the newest.
        setRuns((current) => [...current, ...history.filter((h) => !current.some((c) => c.id === h.id))]);
      })
      .catch((err) => console.error("Loading history failed", err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scrollToNewest.current) return;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: scrollToNewest.current });
    scrollToNewest.current = null;
  }, [runs]);

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

  async function generate(request: GenerateRequest): Promise<boolean> {
    if (lock.current || blockedRef.current) return false;
    lock.current = true;
    setInFlight(true);

    // The turn goes up before sign-in or the API: the first generation is the slowest path in the app.
    const id = crypto.randomUUID();
    scrollToNewest.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    setRuns((current) => [
      { id, request, status: "pending", live: true, startedAt: Date.now(), images: [] },
      ...current,
    ]);

    try {
      const outcome = await requestGeneration(request);
      if (outcome.ok) {
        updateRun(id, {
          status: "done",
          images: outcome.images,
          creditsLeft: outcome.credits,
          completedAt: Date.now(),
        });
        setCredits(outcome.credits);
        return true;
      }

      const { code, message } = outcome;
      if (code === "PROVIDER_ERROR") {
        updateRun(id, { status: "failed", completedAt: Date.now() });
        return false;
      }

      // Every other code was rejected before any spend; the assistant explains it in the thread.
      updateRun(id, { status: "rejected", completedAt: Date.now(), rejection: { code, message } });
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
      updateRun(id, {
        status: "rejected",
        completedAt: Date.now(),
        rejection: { code: "NETWORK", message: err instanceof Error ? err.message : String(err) },
      });
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

    // The mobile Create tab. Dropped from the URL so a refresh doesn't refocus.
    if (params.has(FOCUS_PARAM)) {
      composerRef.current?.focus();
      params.delete(FOCUS_PARAM);
      const query = params.toString();
      window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    }

    // A Reuse from /assets: fill the composer and stop there. Only a click on Generate spends.
    const draft = takeStashedDraft();
    if (draft) {
      const { prompt, ...settings } = draft;
      composerRef.current?.setSettings(settings);
      composerRef.current?.setPrompt(prompt);
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

  // The failed or rejected turn stays in the thread as a record; the retry is a new turn below it.
  function retryRun(run: Run) {
    // A pause is the one block a retry is meant to probe; the server says again if it's still on.
    if (run.rejection?.code === "FAL_DISABLED") {
      blockedRef.current = false;
      setBlocked(false);
    }
    void generate(run.request);
  }

  function loadIntoComposer({ prompt, ...settings }: GenerateRequest) {
    composerRef.current?.setSettings(settings);
    composerRef.current?.setPrompt(prompt);
  }

  return (
    <>
      <AmbientBackground active={inFlight} />
      {/* max-w-288 minus px-4 is 1120px: the thread shares the composer's column exactly. */}
      <main className="mx-auto flex w-full max-w-288 flex-1 flex-col px-4 pt-6 pb-72 sm:pb-48">
        {runs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10">
            {hero}
            <ul aria-label={t("image.starters")} className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((starter) => (
                <li key={starter.label}>
                  <button
                    type="button"
                    onClick={() => composerRef.current?.setPrompt(starter.prompt)}
                    className="flex h-9 items-center gap-2 rounded-full border border-border-3 bg-bg-1 px-3.5 text-sm font-medium text-text-2 transition-colors duration-150 hover:border-accent/50 hover:bg-bg-3 hover:text-text-1"
                  >
                    <SparkleIcon gradient className="size-3.5" />
                    {t(starter.label)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ChatThread
            runs={runs}
            onLoad={loadIntoComposer}
            onRetry={retryRun}
            onFavourite={(image, favourite) => {
              if (image.id) void setFavourite(image.id, favourite, image.favourite);
            }}
            onSignUp={() => openAuthModal("signup")}
            retryDisabled={inFlight || blocked}
          />
        )}
      </main>

      {/* Results fade into the page color behind the composer instead of cutting off hard at its edge. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-[calc(15rem+var(--tabbar-h))] bg-linear-to-t from-bg-0 via-bg-0/85 to-transparent sm:h-[calc(11rem+var(--tabbar-h))]"
      />
      <div className="fixed inset-x-4 bottom-[calc(1rem+var(--tabbar-h))] z-30 mx-auto max-w-280 sm:bottom-[calc(1.25rem+var(--tabbar-h))]">
        <Composer ref={composerRef} inFlight={inFlight} blocked={blocked} onGenerate={generate} docked />
      </div>
    </>
  );
}
