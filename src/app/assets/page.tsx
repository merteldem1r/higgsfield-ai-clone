import type { Metadata } from "next";

import { AssetsBrowser } from "./assets-browser";

export const metadata: Metadata = { title: "Assets — Higgsfield AI Clone" };

export default function AssetsPage() {
  return (
    <main className="mx-auto flex w-full max-w-360 flex-1 flex-col gap-4 px-4 pt-4 pb-10 sm:px-6 lg:flex-row lg:items-start">
      <AssetsBrowser />
    </main>
  );
}
