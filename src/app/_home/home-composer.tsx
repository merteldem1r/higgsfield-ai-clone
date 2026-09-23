"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useRef, useState, type ReactNode, type RefObject } from "react";

import { Composer, type ComposerHandle } from "@/components/composer/composer";
import { stashGeneration } from "@/components/composer/handoff";
import type { GenerateRequest } from "@/components/composer/types";

type LoadOptions = { select?: [number, number]; settings?: Partial<Omit<GenerateRequest, "prompt">> };

type HomeComposerState = {
  composerRef: RefObject<ComposerHandle | null>;
  anchorRef: RefObject<HTMLDivElement | null>;
  loadPrompt: (prompt: string, options?: LoadOptions) => void;
};

const HomeComposerContext = createContext<HomeComposerState | null>(null);

export function useHomeComposer(): HomeComposerState {
  const ctx = useContext(HomeComposerContext);
  if (!ctx) throw new Error("useHomeComposer must be used inside <HomeComposerProvider>");
  return ctx;
}

// Lets Recreate (showcase) and the preset tiles fill the one hero composer from anywhere on the page.
export function HomeComposerProvider({ children }: { children: ReactNode }) {
  const composerRef = useRef<ComposerHandle>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  function loadPrompt(prompt: string, { select, settings }: LoadOptions = {}) {
    if (settings) composerRef.current?.setSettings(settings);
    composerRef.current?.setPrompt(prompt, select);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    anchorRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
  }

  return (
    <HomeComposerContext value={{ composerRef, anchorRef, loadPrompt }}>{children}</HomeComposerContext>
  );
}

export function HeroComposer() {
  const { composerRef, anchorRef } = useHomeComposer();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function handOff(request: GenerateRequest): Promise<boolean> {
    try {
      stashGeneration(request);
    } catch (err) {
      // Storage blocked: /image still opens, just without the run already started.
      console.error("Couldn't hand the generation to /image", err);
    }
    // Shows the composer's in-flight state for the moment the route change takes.
    setLeaving(true);
    router.push("/image");
    return false;
  }

  return (
    <div ref={anchorRef} className="relative isolate mx-auto w-full max-w-4xl scroll-mt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -inset-y-6 -z-10 rounded-full bg-brand-gradient opacity-20 blur-3xl"
      />
      <Composer ref={composerRef} inFlight={leaving} blocked={false} onGenerate={handOff} />
    </div>
  );
}
