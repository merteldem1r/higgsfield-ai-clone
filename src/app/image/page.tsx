import type { Metadata } from "next";

import { FannedStack } from "@/components/fanned-stack";

import { ImageStudio } from "./image-studio";

export const metadata: Metadata = { title: "Image — Higgsfield clone" };

export default function ImagePage() {
  return <ImageStudio hero={<ImageHero />} />;
}

function ImageHero() {
  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <FannedStack />
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-display text-display-sm uppercase sm:text-display">
          Start creating with
          <br />
          <span className="text-brand-gradient">real AI images</span>
        </h1>
        <p className="max-w-md text-base text-text-2">
          Describe a scene, character, mood, or style — and watch it come to life. 6 free credits, no signup.
        </p>
      </div>
    </section>
  );
}
