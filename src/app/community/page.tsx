import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { FannedStack } from "@/components/fanned-stack";
import { SparkleIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";

import { CommunityGrid } from "./community-grid";
import { loadCommunityFeed, type CommunityItem } from "./feed";

export const metadata: Metadata = { title: "Community — Higgsfield clone" };

// Featuring is a hand edit in the SQL editor, so a minute of staleness is fine and the page stays on the CDN.
export const revalidate = 60;

export default async function CommunityPage() {
  let items: CommunityItem[] | null = null;
  try {
    items = await loadCommunityFeed();
  } catch (err) {
    console.error("Loading the community feed failed", err);
  }

  return (
    <>
      <main className="mx-auto w-full max-w-360 flex-1 px-4 pt-10 pb-16 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-h2 uppercase">
            <span className="text-brand-gradient">Community</span>
          </h1>
          <p className="mt-1.5 text-sm text-text-2">
            A hand-picked set of images made on this site. Hover for the prompt, then recreate it.
          </p>
        </div>

        {items === null ? (
          <State title="Couldn't load the community feed" text="Refresh the page to try again." />
        ) : items.length === 0 ? (
          <State stack title="Nothing featured yet" text="Hand-picked generations from this site will show up here." />
        ) : (
          <CommunityGrid items={items} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function State({ title, text, stack = false }: { title: string; text: string; stack?: boolean }): ReactNode {
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
        Generate
      </Link>
    </div>
  );
}
