import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { FannedStack } from "@/components/fanned-stack";
import { SparkleIcon } from "@/components/icons";
import type { T } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";

import { CommunityGrid } from "./community-grid";
import { loadCommunityFeed, type CommunityItem } from "./feed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.community") };
}

// Featuring is a hand edit in the SQL editor, so a minute of staleness is fine and the page stays on the CDN.
export const revalidate = 60;

export default async function CommunityPage() {
  const t = await getT();
  let items: CommunityItem[] | null = null;
  try {
    items = await loadCommunityFeed();
  } catch (err) {
    console.error("Loading the community feed failed", err);
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-12 px-4 pt-12 pb-24 sm:px-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-display-sm font-medium sm:text-display">{t("nav.community")}</h1>
          <p className="max-w-2xl text-base text-text-2">{t("community.text")}</p>
          <div className="flex flex-wrap items-center gap-4 pt-1 text-sm">
            {items && items.length > 0 && (
              <span className="text-text-3 tabular-nums">{t("community.stats", { n: items.length, c: creatorCount(items) })}</span>
            )}
            <Link href="/image" className="text-text-2 transition-colors duration-150 hover:text-text-1">
              {t("home.openImage")}
            </Link>
          </div>
        </div>

        {items === null ? (
          <State t={t} title={t("community.failed.title")} text={t("community.failed.text")} />
        ) : items.length === 0 ? (
          <State t={t} stack title={t("community.empty.title")} text={t("community.empty.text")} />
        ) : (
          <CommunityGrid items={items} />
        )}
      </main>
    </>
  );
}

const creatorCount = (items: CommunityItem[]) => new Set(items.map((item) => item.handle)).size;

function State({ t, title, text, stack = false }: { t: T; title: string; text: string; stack?: boolean }): ReactNode {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      {stack && (
        <div className="mb-2">
          <FannedStack size="small" />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold">{title}</p>
        <p className="text-sm text-text-2">{text}</p>
      </div>
      <Link
        href="/image"
        className="mt-2 flex h-9 items-center gap-2 rounded-md bg-white px-3.5 text-sm font-semibold text-black transition-colors duration-150 hover:bg-white/85"
      >
        <SparkleIcon className="size-4" />
        {t("composer.generate")}
      </Link>
    </div>
  );
}
