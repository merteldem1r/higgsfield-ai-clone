import type { Metadata } from "next";

import { FannedStack } from "@/components/fanned-stack";
import { FREE_CREDITS } from "@/lib/credits";
import { getT } from "@/lib/i18n/server";

import { ImageStudio } from "./image-studio";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t("nav.image")} — Higgsfield AI Clone` };
}

export default function ImagePage() {
  return <ImageStudio hero={<ImageHero />} />;
}

async function ImageHero() {
  const t = await getT();
  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <FannedStack />
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-display text-display-sm uppercase sm:text-display">
          {t("image.heroTop")}
          <br />
          <span className="text-brand-gradient">{t("image.heroAccent")}</span>
        </h1>
        <p className="max-w-md text-base text-text-2">
          {t("image.heroText", { n: FREE_CREDITS })}
        </p>
      </div>
    </section>
  );
}
