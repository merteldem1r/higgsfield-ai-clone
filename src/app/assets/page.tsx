import type { Metadata } from "next";

import { getT } from "@/lib/i18n/server";

import { AssetsBrowser } from "./assets-browser";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.gallery") };
}

export default function AssetsPage() {
  return (
    <main className="mx-auto flex w-full max-w-360 flex-1 flex-col gap-4 px-4 pt-4 pb-10 sm:px-6 lg:flex-row lg:items-start">
      <AssetsBrowser />
    </main>
  );
}
