import type { Metadata } from "next";

import { getT } from "@/lib/i18n/server";

import { AssetsBrowser } from "./assets-browser";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.gallery") };
}

export default async function AssetsPage() {
  const t = await getT();
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-12 px-4 pt-12 pb-24 sm:px-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-display-sm font-medium sm:text-display">{t("nav.gallery")}</h1>
        <p className="max-w-2xl text-base text-text-2">{t("assets.intro")}</p>
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <AssetsBrowser />
      </div>
    </main>
  );
}
