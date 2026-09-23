"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useApp } from "@/components/app-provider";
import { batchCost, DEFAULT_ASPECT, isAspectId, isModelId } from "@/lib/credits";
import { createClient } from "@/lib/supabase/client";

import { Composer, type ComposerHandle } from "./composer";
import { NoticeBar } from "./notice-bar";
import { requestGeneration } from "./request-generation";
import { ResultsGrid } from "./results-grid";
import type { GenerateRequest, Notice, Run } from "./types";

const BUCKET = "generations";
const HISTORY_LIMIT = 40;

// DESIGN.md → Error surfaces. Codes not listed here fall through to the generic toast.
const NOTICES: Record<string, Notice> = {
  GLOBAL_CAP: {
    tone: "danger",
    text: "Demo budget reached for today — generation resumes tomorrow. Your gallery is still here.",
    link: { href: "/assets", label: "View assets" },
  },
  FAL_DISABLED: { tone: "neutral", text: "Generation is paused right now. Try again in a few minutes." },
  IP_LIMIT: { tone: "neutral", text: "Daily limit reached on this network. Come back tomorrow." },
};

type HistoryRow = {
  id: string;
  prompt: string;
  model: string;
  aspect: string;
  batch: number;
  created_at: string;
  assets: { storage_path: string; width: number | null; height: number | null }[];
};

async function loadHistory(): Promise<Run[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return [];

  const { data, error } = await supabase
    .from("generations")
    .select("id, prompt, model, aspect, batch, created_at, assets(storage_path, width, height)")
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
        startedAt: Date.parse(row.created_at),
        images: row.assets
          .toSorted((a, b) => a.storage_path.localeCompare(b.storage_path))
          .map((asset) => ({
            url: supabase.storage.from(BUCKET).getPublicUrl(asset.storage_path).data.publicUrl,
            width: asset.width,
            height: asset.height,
          })),
      },
    ];
  });
}

export function ImageStudio({ hero }: { hero: ReactNode }) {
  const { refreshCredits, setCredits, showToast, openAuthModal } = useApp();
  const [runs, setRuns] = useState<Run[]>([]);
  const [inFlight, setInFlight] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // The ref is the real lock: state updates are async, so a double click could slip past `inFlight`.
  const lock = useRef(false);
  const composerRef = useRef<ComposerHandle>(null);
  // Toast actions outlive the render that created them, so they call the latest generate.
  const latestGenerate = useRef<((request: GenerateRequest) => Promise<boolean>) | null>(null);
  const retry = (request: GenerateRequest) => void latestGenerate.current?.(request);

  useEffect(() => {
    let cancelled = false;
    loadHistory()
      .then((history) => {
        if (cancelled) return;
        // Runs started before history arrived stay on top.
        setRuns((current) => [...current, ...history.filter((h) => !current.some((c) => c.id === h.id))]);
      })
      .catch((err) => console.error("Loading history failed", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRun = (id: string, patch: Partial<Run>) =>
    setRuns((current) => current.map((run) => (run.id === id ? { ...run, ...patch } : run)));
  const removeRun = (id: string) => setRuns((current) => current.filter((run) => run.id !== id));

  async function generate(request: GenerateRequest): Promise<boolean> {
    if (lock.current || notice) return false;
    lock.current = true;
    setInFlight(true);

    // The tile goes up before sign-in or the API: the first generation is the slowest path in the app.
    const id = crypto.randomUUID();
    setRuns((current) => [{ id, request, status: "pending", startedAt: Date.now(), images: [] }, ...current]);

    try {
      const outcome = await requestGeneration(request);
      if (outcome.ok) {
        updateRun(id, { status: "done", images: outcome.images });
        setCredits(outcome.credits);
        return true;
      }

      const { code, message } = outcome;
      if (code === "PROVIDER_ERROR") {
        updateRun(id, { status: "failed" });
        const { credits } = batchCost(request.model, request.batch);
        showToast({ tone: "danger", text: `Generation failed — ${credits} credits refunded.` });
        return false;
      }

      removeRun(id);
      if (code === "INSUFFICIENT_CREDITS") {
        openAuthModal("out-of-credits");
        void refreshCredits();
      } else if (code in NOTICES) {
        setNotice(NOTICES[code]);
      } else {
        showToast({ tone: "danger", text: message, action: { label: "Retry", onClick: () => retry(request) } });
      }
      return false;
    } catch (err) {
      console.error("Generation request failed", err);
      removeRun(id);
      showToast({
        tone: "danger",
        text: "Couldn't reach the server. Check your connection.",
        action: { label: "Retry", onClick: () => retry(request) },
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

  function retryRun(run: Run) {
    if (lock.current || notice) return;
    removeRun(run.id);
    void generate(run.request);
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-360 flex-1 flex-col px-4 pt-4 pb-72 sm:px-6 sm:pb-45">
        {runs.length === 0 ? (
          hero
        ) : (
          <ResultsGrid
            runs={runs}
            onRetry={retryRun}
            retryDisabled={inFlight || notice !== null}
            onReusePrompt={(prompt) => composerRef.current?.setPrompt(prompt)}
          />
        )}
      </main>

      <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-280 flex-col gap-2 sm:bottom-5">
        {notice && <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />}
        <Composer ref={composerRef} inFlight={inFlight} blocked={notice !== null} onGenerate={generate} />
      </div>
    </>
  );
}
