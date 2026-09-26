import Link from "next/link";
import type { ReactNode } from "react";

import { getT } from "@/lib/i18n/server";

import { HeroComposer, HomeComposerProvider } from "./_home/home-composer";
import { ModelChips } from "./_home/model-chips";
import { PresetRow } from "./_home/preset-row";
import { PromoCarousel } from "./_home/promo-carousel";
import { ShowcaseGrid } from "./_home/showcase-grid";

export default async function Home() {
  const t = await getT();
  return (
    <>
      <main className="mx-auto w-full max-w-360 flex-1 overflow-x-clip px-4 pt-4 sm:px-6">
        <HomeComposerProvider>
          <PromoCarousel />

          <section aria-labelledby="hero-title" className="flex flex-col items-center gap-8 pt-16 pb-4 sm:pt-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <h1 id="hero-title" className="font-display text-display-sm uppercase sm:text-display">
                {t("home.heroTop")}
                <br />
                <span className="text-brand-gradient">{t("home.heroAccent")}</span>
              </h1>
              <p className="text-base text-text-2">{t("home.heroText")}</p>
            </div>
            <HeroComposer />
            <ModelChips />
          </section>

          <Section
            id="showcase"
            title={t("home.showcaseTitle")}
            subtitle={t("home.showcaseText")}
            action={
              <Link
                href="/image"
                className="flex h-9 shrink-0 items-center rounded-md bg-bg-3 px-3.5 text-sm font-medium transition-colors duration-150 hover:bg-bg-5"
              >
                {t("home.openImage")}
              </Link>
            }
          >
            <ShowcaseGrid />
          </Section>

          <Section
            id="presets"
            title={t("home.presetsTitle")}
            subtitle={t("home.presetsText")}
          >
            <PresetRow />
          </Section>
        </HomeComposerProvider>
      </main>
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
