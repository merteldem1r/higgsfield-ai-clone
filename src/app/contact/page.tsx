import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronRightIcon } from "@/components/icons";
import { getT } from "@/lib/i18n/server";

import { CONTACT_EMAIL, GITHUB_URL, LINKEDIN_URL } from "./channels";
import { ContactForm } from "./contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.contact") };
}

export default async function ContactPage() {
  const t = await getT();
  return (
    <main className="mx-auto flex w-full max-w-[calc(880px+2rem)] flex-1 flex-col gap-10 px-4 pt-12 pb-24">
      <div className="flex flex-col gap-3">
        <h1 className="text-display-sm font-medium sm:text-display">{t("nav.contact")}</h1>
        <p className="max-w-2xl text-base text-text-2">{t("contact.intro")}</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-16">
        {CONTACT_EMAIL ? <ContactForm to={CONTACT_EMAIL} /> : <p className="text-sm text-text-2">{t("contact.noForm")}</p>}

        {/* Each channel takes a step of the spectrum; hovering slides the arrow in and colours the name. */}
        <ul className="flex flex-col divide-y divide-line-1 border-y border-line-1 self-start">
          {CONTACT_EMAIL && (
            <Channel label={t("contact.email")} href={`mailto:${CONTACT_EMAIL}`} tone="text-brand-sky">
              {CONTACT_EMAIL}
            </Channel>
          )}
          <Channel label="GitHub" href={GITHUB_URL} tone="text-brand-violet">
            github.com/merteldem1r
          </Channel>
          <Channel label="LinkedIn" href={LINKEDIN_URL} tone="text-brand-pink">
            linkedin.com/in/merteldemir
          </Channel>
          <Channel label={t("faq.title")} href="/faq" tone="text-brand-peach" internal>
            {t("contact.readFaq")}
          </Channel>
        </ul>
      </div>
    </main>
  );
}

function Channel({
  label,
  href,
  tone,
  internal = false,
  children,
}: {
  label: string;
  href: string;
  tone: string;
  internal?: boolean;
  children: ReactNode;
}) {
  const className = "group flex items-center justify-between gap-4 py-4";
  const body = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`text-xs ${tone}`}>{label}</span>
        <span className="truncate text-sm font-medium text-text-1 transition-colors duration-150 group-hover:text-accent-text">{children}</span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-text-3 transition-[translate,color] duration-150 group-hover:text-text-1 motion-safe:group-hover:translate-x-0.5" />
    </>
  );
  return (
    <li>
      {internal ? (
        <Link href={href} className={className}>
          {body}
        </Link>
      ) : (
        <a href={href} className={className}>
          {body}
        </a>
      )}
    </li>
  );
}
