"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useApp } from "./app-provider";
import { SparkleIcon } from "./icons";
import { useT } from "./locale-provider";

const TICK_MS = 300;

// Counts from the previous balance to the new one instead of jumping.
function useTickingNumber(target: number | null): number | null {
  const [shown, setShown] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (target === null) return;
    const start = from.current ?? target;
    from.current = target;
    if (start === target) {
      const frame = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(frame);
    }
    const t0 = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const p = Math.min((now - t0) / TICK_MS, 1);
      setShown(Math.round(start + (target - start) * p));
      if (p < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return shown;
}

// The balance as a plain figure in the nav. The gradient sparkle marks it as live; it's the only colour up here.
export function CreditsPill() {
  const router = useRouter();
  const { account, credits, openAuthModal } = useApp();
  const shown = useTickingNumber(credits);
  const t = useT();
  const empty = credits === 0;

  return (
    <button
      type="button"
      onClick={() =>
        account?.status === "member" ? router.push("/pricing") : openAuthModal(empty ? "out-of-credits" : "signup")
      }
      aria-label={credits === null ? t("credits.label") : t("credits.count", { n: credits })}
      className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium tabular-nums transition-colors duration-150 hover:bg-bg-2 ${
        empty ? "text-danger motion-safe:animate-danger-pulse" : "text-text-1"
      }`}
    >
      <SparkleIcon gradient className="size-3.5" />
      <span aria-hidden className="sm:hidden">{shown ?? "–"}</span>
      <span aria-hidden className="max-sm:hidden">{shown === null ? "–" : t("credits.count", { n: shown })}</span>
    </button>
  );
}
