import type { Metadata } from "next";
import Link from "next/link";

import { ChevronUpIcon } from "@/components/icons";
import { FREE_CREDITS, UPGRADE_BONUS } from "@/lib/credits";
import { getT } from "@/lib/i18n/server";

import { Plans } from "./plans";
import { SignUpButton } from "./sign-up-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.pricing") };
}

import { FAQ_PARAMS, PRICING_FAQ } from "../faq/faq-data";

export default async function PricingPage() {
  const t = await getT();
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-12 px-4 pt-12 pb-24">
      <section aria-labelledby="plans-title" className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 id="plans-title" className="text-display-sm font-medium sm:text-display">
            {t("pricing.headline")}
          </h1>
          <p className="max-w-2xl text-base text-text-2">
            {t("pricing.subtitle", { n: FREE_CREDITS })} {t("pricing.demoNote")}
          </p>
        </div>

        <div className="flex flex-col gap-3 border-y border-line-1 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="text-text-2">{t("pricing.bonusRow", { n: UPGRADE_BONUS })}</p>
          <SignUpButton className="flex h-9 shrink-0 items-center rounded-md bg-text-1 px-3.5 text-sm font-semibold text-bg-0 transition-colors duration-150 hover:bg-white">
            {t("thread.signUpFor", { n: UPGRADE_BONUS })}
          </SignUpButton>
        </div>

        <Plans />
      </section>

      <section aria-labelledby="faq-title" className="flex flex-col gap-4">
        <h2 id="faq-title" className="text-h2 font-medium">
          {t("pricing.faqTitle")}
        </h2>
        <div className="divide-y divide-line-1 border-y border-line-1">
          {PRICING_FAQ.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                {t(item.q)}
                <ChevronUpIcon className="size-4 shrink-0 rotate-180 text-text-2 transition-transform duration-200 group-open:rotate-0" />
              </summary>
              <p className="max-w-2xl pb-5 text-sm leading-6 text-text-2">{t(item.a, FAQ_PARAMS)}</p>
            </details>
          ))}
        </div>

        <Link href="/faq" className="self-start text-sm text-text-2 transition-colors duration-150 hover:text-text-1">
          {t("pricing.moreQuestions")}
        </Link>

        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="text-text-2">{t("pricing.ready")}</span>
          <Link
            href="/image"
            className="flex h-9 items-center rounded-md bg-text-1 px-3.5 font-semibold text-bg-0 transition-colors duration-150 hover:bg-white"
          >
            {t("authModal.start")}
          </Link>
        </div>
      </section>
    </main>
  );
}
