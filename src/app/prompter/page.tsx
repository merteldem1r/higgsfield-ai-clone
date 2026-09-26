import type { Metadata } from "next";

import { loadCommunityFeed, type CommunityItem } from "@/app/community/feed";
import { SHOWCASE } from "@/components/showcase";
import { getT } from "@/lib/i18n/server";
import { showcaseId } from "@/lib/look";

import { Prompter } from "./prompter";
import type { PoolItem } from "./types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.prompter") };
}

// Same feed as /community, so the same minute of staleness.
export const revalidate = 60;

// Featured first (newest), then the showcase. Every image is ours and comes with the exact prompt that made it,
// which is what the look is read from. One tile per generation: the prompt is the unit, not the image.
function buildPool(featured: CommunityItem[]): PoolItem[] {
  const seen = new Set<string>();
  const fromFeed = featured.flatMap((item): PoolItem[] => {
    if (seen.has(item.id)) return [];
    seen.add(item.id);
    return [{ id: item.id, src: item.url, prompt: item.prompt, size: null }];
  });
  const fromShowcase = SHOWCASE.map(
    (item): PoolItem => ({
      id: showcaseId(item.src),
      src: item.src,
      prompt: item.prompt,
      size: { width: item.width, height: item.height },
    }),
  );
  return [...fromFeed, ...fromShowcase];
}

export default async function PrompterPage() {
  const t = await getT();
  let featured: CommunityItem[] | null = null;
  try {
    featured = await loadCommunityFeed();
  } catch (err) {
    console.error("Loading the community feed for the prompter failed", err);
  }

  return (
    <main className="mx-auto flex w-full max-w-[calc(880px+2rem)] flex-1 flex-col gap-10 px-4 pt-12 pb-24">
      <div className="flex flex-col gap-3">
        <h1 className="text-display-sm font-medium sm:text-display">{t("nav.prompter")}</h1>
        <p className="text-base text-text-2">{t("prompter.intro")}</p>
      </div>
      <Prompter pool={buildPool(featured ?? [])} featuredFailed={featured === null} />
    </main>
  );
}
