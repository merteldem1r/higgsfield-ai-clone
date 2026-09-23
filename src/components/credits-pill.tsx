"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useApp } from "./app-provider";
import { SparkleIcon } from "./icons";

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

export function CreditsPill() {
  const router = useRouter();
  const { account, credits, openAuthModal } = useApp();
  const shown = useTickingNumber(credits);
  const empty = credits === 0;

  return (
    <button
      type="button"
      onClick={() =>
        account?.status === "member" ? router.push("/pricing") : openAuthModal(empty ? "out-of-credits" : "signup")
      }
      aria-label={credits === null ? "Credits" : `${credits} credits`}
      className={`flex h-8 items-center gap-1.5 rounded-full border border-border-3 bg-bg-3 px-3 transition-colors duration-150 hover:bg-bg-5 ${
        empty ? "motion-safe:animate-danger-pulse" : ""
      }`}
    >
      <SparkleIcon gradient className="size-3.5" />
      <span className={`min-w-3 text-sm font-semibold tabular-nums ${empty ? "text-danger" : "text-text-1"}`}>
        {shown ?? "–"}
      </span>
    </button>
  );
}
