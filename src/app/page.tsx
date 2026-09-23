import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";

import { HeroComposer, HomeComposerProvider } from "./_home/home-composer";
import { ModelChips } from "./_home/model-chips";
import { PresetRow } from "./_home/preset-row";
import { PromoCarousel } from "./_home/promo-carousel";
import { ShowcaseGrid } from "./_home/showcase-grid";

export default function Home() {
  return (
    <>
      <main className="mx-auto w-full max-w-360 flex-1 px-4 pt-4 sm:px-6">
        <HomeComposerProvider>
          <PromoCarousel />

          <section aria-labelledby="hero-title" className="flex flex-col items-center gap-8 pt-16 pb-4 sm:pt-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <h1 id="hero-title" className="font-display text-display-sm uppercase sm:text-display">
                Type a scene.
                <br />
                <span className="text-brand-gradient">Get a real image.</span>
              </h1>
              <p className="text-base text-text-2">Flux runs right here. Six free credits, no signup.</p>
            </div>
            <HeroComposer />
            <ModelChips />
          </section>

          <Section
            id="showcase"
            title="Made with Flux"
            subtitle="Every image here came out of this site's composer, prompt and all."
            action={
              <Link
                href="/image"
                className="flex h-9 shrink-0 items-center rounded-md bg-bg-3 px-3.5 text-sm font-medium transition-colors duration-150 hover:bg-bg-5"
              >
                Open Image
              </Link>
            }
          >
            <ShowcaseGrid />
          </Section>

          <Section
            id="presets"
            title="Start from a style"
            subtitle="Pick a look, then type your own subject over the highlighted words."
          >
            <PresetRow />
          </Section>
        </HomeComposerProvider>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="mt-20">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 id={`${id}-title`} className="font-display text-h2 uppercase">
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-text-2">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
