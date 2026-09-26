import type { Metadata } from "next";
import Link from "next/link";

import { ChevronUpIcon, TagIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { FREE_CREDITS, MODELS, UPGRADE_BONUS } from "@/lib/credits";
import type { MessageKey } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";

import { Plans } from "./plans";
import { SignUpButton } from "./sign-up-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.pricing") };
}

const schnell = MODELS["flux-schnell"];
const dev = MODELS["flux-dev"];

// Answers describe how this demo really behaves; the plans above are the only illustrative part.
const FAQ: { q: MessageKey; a: MessageKey }[] = [
  { q: "faq.credits.q", a: "faq.credits.a" },
  { q: "faq.free.q", a: "faq.free.a" },
  { q: "faq.failed.q", a: "faq.failed.a" },
  { q: "faq.buy.q", a: "faq.buy.a" },
  { q: "faq.limit.q", a: "faq.limit.a" },
  { q: "faq.higgs.q", a: "faq.higgs.a" },
];

const FAQ_PARAMS = {
  schnell: schnell.label,
  schnellCost: schnell.credits,
  dev: dev.label,
  devCost: dev.credits,
  free: FREE_CREDITS,
  schnellCount: Math.floor(FREE_CREDITS / schnell.credits),
  devCount: Math.floor(FREE_CREDITS / dev.credits),
};

export default async function PricingPage() {
  const t = await getT();
  return (
    <>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 pb-10">
        <section className="relative overflow-hidden rounded-2xl border border-white/8 bg-bg-1 bg-promo px-6 py-7 sm:px-8 sm:py-9">
          <span className="inline-flex h-5 items-center gap-1 rounded-xs bg-brand-pink px-1.5 text-[10px] leading-3 font-bold tracking-[0.02em] text-accent-ink uppercase italic">
            <TagIcon className="size-2.5" />
            {t("pricing.bonusBadge")}
          </span>
          <h2 className="mt-4 font-display text-display-sm uppercase sm:text-display">
            <span className="text-brand-gradient">{t("pricing.bonusTitle", { n: UPGRADE_BONUS })}</span>
            <br />
            {t("pricing.bonusTitle2")}
          </h2>
          <p className="mt-3 max-w-lg text-sm text-text-2">
            {t("pricing.bonusText")}
          </p>
          <SignUpButton className="mt-6 flex h-10 items-center rounded-md bg-white px-4 text-sm font-semibold text-black transition-colors duration-150 hover:bg-white/85">
            {t("thread.signUpFor", { n: UPGRADE_BONUS })}
          </SignUpButton>
        </section>

        <section aria-labelledby="plans-title" className="mt-16">
          <h1 id="plans-title" className="text-[40px] leading-11 font-semibold tracking-[-0.02em]">
            {t("pricing.title")}
          </h1>
          <p className="mt-2 text-sm text-text-2">
            {t("pricing.subtitle", { n: FREE_CREDITS })}
          </p>
          <div className="mt-8">
            <Plans />
          </div>
          <p className="mt-5 text-center text-xs text-text-3">{t("pricing.demoNote")}</p>
        </section>

        <section aria-labelledby="faq-title" className="mx-auto mt-24 w-full max-w-2xl">
          <h2 id="faq-title" className="text-center text-[32px] leading-10 font-semibold tracking-[-0.02em]">
            {t("pricing.faqTitle")}
          </h2>
          <div className="mt-8 flex flex-col gap-2.5">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border-2 bg-bg-1 transition-colors duration-150 open:bg-bg-2 hover:border-border-3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  {t(item.q)}
                  <ChevronUpIcon className="size-4 shrink-0 rotate-180 text-text-2 transition-transform duration-200 group-open:rotate-0" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-6 text-text-2">{t(item.a, FAQ_PARAMS)}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 flex items-center justify-center gap-3 text-sm">
            <span className="text-text-2">{t("pricing.ready")}</span>
            <Link
              href="/image"
              className="flex h-9 items-center rounded-md bg-brand-gradient px-3.5 font-semibold text-accent-ink transition-[filter] duration-150 hover:brightness-110"
            >
              {t("authModal.start")}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
