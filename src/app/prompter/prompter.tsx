"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { stashDraft } from "@/components/composer/handoff";
import { FannedStack } from "@/components/fanned-stack";
import { AlertIcon, SparkleIcon, SpinnerIcon, XIcon } from "@/components/icons";
import { Lightbox } from "@/components/lightbox";
import { useLocale } from "@/components/locale-provider";
import type { AspectId, ModelId } from "@/lib/credits";
import type { MessageKey } from "@/lib/i18n";
import { MAX_PICKS } from "@/lib/look";

import { LookFrame, lookPrompt, PendingLook, phrasesOn } from "./look-frame";
import { PickGrid, Thumb } from "./pick-grid";
import { requestLook, type LookOutcome } from "./request-look";
import type { LookResult, Pick, PoolItem } from "./types";

// Two credits and three tries on a new balance, for a look the visitor is still exploring. The composer shows
// the cost and the model can be switched there before anything is spent.
const HANDOFF_MODEL: ModelId = "flux-schnell";
const EARLIER_LIMIT = 5;
const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

type Notice = { line: MessageKey; action: "retry" | "clear" | null; blocking: boolean };

// IP_LIMIT fails again for this whole network until tomorrow, so it locks the bench, as the wand does.
function noticeFor(code: string): Notice {
  switch (code) {
    case "IP_LIMIT":
      return { line: "prompter.err.limit", action: null, blocking: true };
    case "TIMEOUT":
      return { line: "prompter.err.timeout", action: "retry", blocking: false };
    case "PROVIDER_ERROR":
      return { line: "prompter.err.provider", action: "retry", blocking: false };
    case "UNKNOWN_IMAGE":
      return { line: "prompter.err.stale", action: "clear", blocking: false };
    case "NETWORK":
      return { line: "assistant.reject.network", action: "retry", blocking: false };
    default:
      return { line: "prompter.err.unknown", action: "retry", blocking: false };
  }
}

const LINK = "shrink-0 font-medium text-accent-text transition-colors duration-150 hover:text-text-1";

export function Prompter({ pool, featuredFailed }: { pool: PoolItem[]; featuredFailed: boolean }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [picks, setPicks] = useState<Pick[]>([]);
  /** Newest first; the first is the one shown in full. */
  const [results, setResults] = useState<LookResult[]>([]);
  const [pending, setPending] = useState<{ startedAt: number; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const [open, setOpen] = useState<PoolItem | null>(null);
  // True once the bench has scrolled out of view; the floating pill shows only then.
  const [benchAway, setBenchAway] = useState(false);
  // The ref is the real lock: state updates are async, so a double click could slip past `pending`.
  const lock = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const benchRef = useRef<HTMLElement>(null);

  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    const el = benchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setBenchAway(!entry.isIntersecting), { rootMargin: "-56px 0px 0px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const notice = error ? noticeFor(error) : null;

  // Changing the picks is this page's "typing": it clears a notice that doesn't lock the bench.
  function changePicks(next: (current: Pick[]) => Pick[]) {
    setPicks(next);
    if (notice && !notice.blocking) setError(null);
  }

  function toggle(item: PoolItem, aspect: AspectId) {
    changePicks((current) =>
      current.some((pick) => pick.item.id === item.id)
        ? current.filter((pick) => pick.item.id !== item.id)
        : current.length >= MAX_PICKS
          ? current
          : [...current, { item, aspect }],
    );
  }

  function scrollToBench() {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    benchRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }

  async function find() {
    if (lock.current || limited || picks.length === 0) return;
    lock.current = true;
    const snapshot = picks;
    const startedAt = Date.now();
    const controller = new AbortController();
    abort.current = controller;
    setError(null);
    setPending({ startedAt, count: snapshot.length });

    let outcome: LookOutcome;
    try {
      outcome = await requestLook(
        snapshot.map((pick) => pick.item.id),
        controller.signal,
      );
    } catch {
      return; // aborted: the page unmounted
    } finally {
      lock.current = false;
      setPending(null);
    }

    if (!outcome.ok) {
      if (outcome.code === "IP_LIMIT") setLimited(true);
      setError(outcome.code);
      return;
    }
    const result: LookResult = {
      id: crypto.randomUUID(),
      at: startedAt,
      seconds: (Date.now() - startedAt) / 1000,
      picks: snapshot,
      look: outcome.look,
      subjects: outcome.subjects,
      off: [],
    };
    setResults((current) => [result, ...current].slice(0, EARLIER_LIMIT + 1));
  }

  function togglePhrase(resultId: string, index: number) {
    setResults((current) =>
      current.map((result) =>
        result.id !== resultId
          ? result
          : { ...result, off: result.off.includes(index) ? result.off.filter((i) => i !== index) : [...result.off, index] },
      ),
    );
  }

  function restore(resultId: string) {
    setResults((current) => {
      const chosen = current.find((result) => result.id === resultId);
      return chosen ? [chosen, ...current.filter((result) => result.id !== resultId)] : current;
    });
  }

  // A draft only fills the composer on /image, with the subject selected; it never starts a generation.
  function openInStudio(result: LookResult, subject: string) {
    stashDraft({
      prompt: lookPrompt(subject, result),
      model: HANDOFF_MODEL,
      aspect: result.picks[0].aspect,
      batch: 1,
      select: [0, subject.length],
    });
    router.push("/image");
  }

  const current = results[0];
  const earlier = results.slice(1);
  const canFind = picks.length > 0 && !pending && !limited;

  return (
    <>
      <section
        ref={benchRef}
        aria-label={t("prompter.bench")}
        className="flex scroll-mt-20 flex-col gap-3 rounded-xl bg-bg-1 p-4 ring-1 ring-line-2"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <ol aria-label={t("prompter.picksLabel")} className="flex gap-2">
            {Array.from({ length: MAX_PICKS }, (_, i) => {
              const pick = picks[i];
              return (
                <li key={pick?.item.id ?? `empty-${i}`}>
                  {pick ? (
                    <div className="relative">
                      <Thumb item={pick.item} className="size-14 rounded-md" />
                      <button
                        type="button"
                        onClick={() => changePicks((all) => all.filter((p) => p.item.id !== pick.item.id))}
                        aria-label={t("prompter.removePick", { n: i + 1 })}
                        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors duration-150 hover:bg-black/80"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="block size-14 rounded-md bg-bg-2" />
                  )}
                </li>
              );
            })}
          </ol>
          <p aria-live="polite" className="min-w-0 flex-1 text-sm text-text-2 tabular-nums">
            {picks.length === 0
              ? t("prompter.pickPrompt", { max: MAX_PICKS })
              : t("prompter.picked", { n: picks.length, max: MAX_PICKS })}
          </p>
          <button
            type="button"
            onClick={() => void find()}
            disabled={!canFind}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-text-1 px-4 text-sm font-semibold whitespace-nowrap text-bg-0 transition-colors duration-150 enabled:hover:bg-white disabled:bg-bg-3 disabled:text-text-disabled max-sm:w-full"
          >
            {pending ? (
              <>
                <SpinnerIcon className="size-4 motion-safe:animate-spin" />
                {t("prompter.finding")}
              </>
            ) : (
              t("prompter.find")
            )}
          </button>
        </div>

        {notice && (
          <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-bg-2 px-3 py-2.5 text-sm">
            <AlertIcon className={`size-4 shrink-0 ${notice.blocking ? "text-text-2" : "text-danger"}`} />
            <p className="min-w-0 flex-1 text-text-1">{t(notice.line)}</p>
            {notice.action === "retry" && (
              <button type="button" onClick={() => void find()} disabled={!canFind} className={`${LINK} disabled:text-text-disabled`}>
                {t("thread.tryAgain")}
              </button>
            )}
            {notice.action === "clear" && (
              <button type="button" onClick={() => changePicks(() => [])} className={LINK}>
                {t("prompter.clearPicks")}
              </button>
            )}
          </div>
        )}
      </section>

      {pending ? <PendingLook startedAt={pending.startedAt} count={pending.count} /> : current && (
        <LookFrame
          key={current.id}
          result={current}
          model={HANDOFF_MODEL}
          onTogglePhrase={(index) => togglePhrase(current.id, index)}
          onOpen={(subject) => openInStudio(current, subject)}
        />
      )}

      {earlier.length > 0 && (
        <section aria-labelledby="earlier-title" className="flex flex-col gap-3">
          <div className="flex items-center gap-4 text-xs text-text-3">
            <h2 id="earlier-title">{t("prompter.earlier")}</h2>
            <span aria-hidden className="h-px flex-1 bg-line-1" />
          </div>
          <ul className="flex flex-col gap-2">
            {earlier.map((result) => (
              <li key={result.id} className="flex items-baseline gap-3 text-sm text-text-2">
                <time dateTime={new Date(result.at).toISOString()} className="shrink-0 text-xs text-text-3 tabular-nums">
                  {new Intl.DateTimeFormat(locale, TIME).format(result.at)}
                </time>
                <p className="min-w-0 flex-1 truncate">{phrasesOn(result).join(", ")}</p>
                <button
                  type="button"
                  onClick={() => restore(result.id)}
                  disabled={pending !== null}
                  className="shrink-0 font-medium text-text-1 transition-colors duration-150 hover:text-accent-text disabled:text-text-disabled"
                >
                  {t("prompter.restore")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="pool-title" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="pool-title" className="text-h3 font-medium">
            {t("prompter.poolTitle")}
          </h2>
          {pool.length > 0 && <span className="text-xs text-text-3 tabular-nums">{t("assets.count", { n: pool.length })}</span>}
        </div>
        {featuredFailed && pool.length > 0 && <p className="text-sm text-text-2">{t("prompter.featuredFailed")}</p>}
        {pool.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="mb-2">
              <FannedStack size="small" />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-base font-semibold">{t("prompter.poolEmpty.title")}</p>
              <p className="text-sm text-text-2">{t("prompter.poolEmpty.text")}</p>
            </div>
            <Link
              href="/image"
              className="mt-2 flex h-9 items-center gap-2 rounded-md bg-white px-3.5 text-sm font-semibold text-black transition-colors duration-150 hover:bg-white/85"
            >
              <SparkleIcon className="size-4" />
              {t("composer.generate")}
            </Link>
          </div>
        ) : (
          <PickGrid items={pool} picks={picks} onToggle={toggle} onOpen={setOpen} />
        )}
      </section>

      {/* The way back to the bench from deep in the grid, carrying the action with it. */}
      {benchAway && picks.length > 0 && !pending && (
        <button
          type="button"
          onClick={() => {
            scrollToBench();
            void find();
          }}
          className="fixed right-4 bottom-6 z-30 flex h-10 items-center gap-2 rounded-full bg-bg-1 pr-4 pl-3 text-sm font-medium text-text-1 shadow-float ring-1 ring-line-2 transition-colors duration-150 hover:bg-bg-2 motion-safe:animate-rise-in motion-reduce:animate-fade-in sm:right-6"
        >
          <SparkleIcon gradient className="size-4" />
          {limited ? t("prompter.backToPicks") : t("prompter.find")}
          <span className="text-text-2 tabular-nums">{t("prompter.picked", { n: picks.length, max: MAX_PICKS })}</span>
        </button>
      )}

      <Lightbox item={open && { image: { url: open.src }, prompt: open.prompt }} onClose={() => setOpen(null)} />
    </>
  );
}
