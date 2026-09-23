"use client";

import { useEffect, useRef, useState } from "react";

import { useApp, type Toast } from "./app-provider";
import { AlertIcon, XIcon } from "./icons";
import { useT } from "./locale-provider";

const EXIT_MS = 150;

export function ToastViewport() {
  const { toast } = useApp();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute top-full left-1/2 z-50 mt-3 flex w-[calc(100%-32px)] max-w-105 -translate-x-1/2 justify-center"
    >
      {/* Keyed so a new toast replaces the old one with a fresh timer and entry animation. */}
      {toast && <ToastCard key={toast.id} toast={toast} />}
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const { dismissToast } = useApp();
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const pointerY = useRef<number | null>(null);

  useEffect(() => {
    if (paused || leaving) return;
    const timer = setTimeout(() => setLeaving(true), toast.action ? 6000 : 5000);
    return () => clearTimeout(timer);
  }, [paused, leaving, toast.action]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(dismissToast, EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving, dismissToast]);

  const accent = toast.tone === "danger" ? "bg-danger" : "bg-text-2";

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={(e) => {
        pointerY.current = e.clientY;
      }}
      onPointerUp={(e) => {
        if (pointerY.current !== null && e.clientY - pointerY.current < -24) setLeaving(true);
        pointerY.current = null;
      }}
      className={`pointer-events-auto relative flex min-h-11 w-full items-center gap-2.5 overflow-hidden rounded-lg border border-border-3 bg-bg-1 py-3 pr-3 pl-4 shadow-float transition-[opacity,translate] duration-150 ${
        leaving ? "-translate-y-1 opacity-0" : "motion-safe:animate-drop-in motion-reduce:animate-fade-in"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-0.75 ${accent}`} />
      <AlertIcon className={`size-4 shrink-0 ${toast.tone === "danger" ? "text-danger" : "text-text-2"}`} />
      <p className="flex-1 text-sm font-medium">{toast.text}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            setLeaving(true);
          }}
          className="shrink-0 text-sm font-semibold text-accent-text hover:text-accent-hover"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => setLeaving(true)}
        aria-label={t("toast.dismiss")}
        className="shrink-0 rounded-sm p-0.5 text-text-2 transition-colors duration-150 hover:text-text-1"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
