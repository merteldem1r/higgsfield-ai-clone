import type { Metadata } from "next";
import Link from "next/link";

import { ChevronUpIcon } from "@/components/icons";
import { getT } from "@/lib/i18n/server";

import { FAQ_GROUPS, FAQ_PARAMS, type FaqGroup } from "./faq-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("faq.title") };
}

// Each group is a step along the logo's spectrum: its dot in the section links, its heading, and the open marker.
// Full class strings so Tailwind can see them.
const TONE: Record<FaqGroup["id"], { text: string; dot: string; openDot: string }> = {
  start: { text: "text-brand-sky", dot: "bg-brand-sky", openDot: "group-open:bg-brand-sky" },
  credits: { text: "text-brand-violet", dot: "bg-brand-violet", openDot: "group-open:bg-brand-violet" },
  images: { text: "text-brand-pink", dot: "bg-brand-pink", openDot: "group-open:bg-brand-pink" },
  account: { text: "text-brand-peach", dot: "bg-brand-peach", openDot: "group-open:bg-brand-peach" },
};

export default async function FaqPage() {
  const t = await getT();
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-12 px-4 pb-24">
      <div className="relative -mx-4 flex flex-col gap-4 bg-top-glow px-4 pt-12 pb-2">
        <span aria-hidden className="absolute inset-x-4 top-0 h-px bg-brand-gradient" />
        <h1 className="text-display-sm font-medium sm:text-display">{t("faq.title")}</h1>
        <p className="max-w-2xl text-base text-text-2">{t("faq.intro")}</p>
        <nav aria-label={t("faq.sections")} className="flex flex-wrap gap-2 pt-2">
          {FAQ_GROUPS.map((group) => (
            <a
              key={group.id}
              href={`#${group.id}`}
              className="flex h-8 items-center gap-2 rounded-md bg-bg-2 px-3 text-sm font-medium text-text-1 transition-colors duration-150 hover:bg-bg-3"
            >
              <span aria-hidden className={`size-1.5 rounded-full ${TONE[group.id].dot}`} />
              {t(group.title)}
            </a>
          ))}
        </nav>
      </div>

      {FAQ_GROUPS.map((group) => (
        <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className="flex scroll-mt-20 flex-col gap-3">
          <h2 id={`${group.id}-title`} className={`text-h3 font-medium ${TONE[group.id].text}`}>
            {t(group.title)}
          </h2>
          <div className="divide-y divide-line-1 border-y border-line-1">
            {group.items.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium transition-colors duration-150 hover:text-text-1 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-3">
                    {/* The dot fills with the group's colour while the answer is open. */}
                    <span aria-hidden className={`size-1.5 shrink-0 rounded-full bg-bg-3 transition-colors duration-150 ${TONE[group.id].openDot}`} />
                    {t(item.q)}
                  </span>
                  <ChevronUpIcon className="size-4 shrink-0 rotate-180 text-text-2 transition-transform duration-200 group-open:rotate-0" />
                </summary>
                {/* The answer rises in as it opens: motion on the thing that changed. Fade only under reduced motion. */}
                <p className="max-w-2xl pb-5 pl-4.5 text-sm leading-6 text-text-2 motion-safe:group-open:animate-rise-in motion-reduce:group-open:animate-fade-in">
                  {t(item.a, FAQ_PARAMS)}
                </p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="flex flex-col gap-3 border-t border-line-1 pt-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-text-2">{t("faq.stillStuck")}</p>
        <Link
          href="/contact"
          className="flex h-9 shrink-0 items-center self-start rounded-md bg-text-1 px-3.5 font-semibold text-bg-0 transition-colors duration-150 hover:bg-white"
        >
          {t("nav.contact")}
        </Link>
      </div>
    </main>
  );
}
