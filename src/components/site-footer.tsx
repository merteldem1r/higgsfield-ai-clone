import Link from "next/link";

import { getT } from "@/lib/i18n/server";

import { SOURCE_URL } from "@/app/contact/channels";

import { LINKS } from "./nav-data";
import { Wordmark } from "./wordmark";

const LINK = "transition-colors duration-150 hover:text-text-1";

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="mt-24 border-t border-line-1">
      <div className="mx-auto flex w-full max-w-360 flex-col gap-8 px-4 py-10 text-sm text-text-2 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex flex-col gap-3">
          <Wordmark label={t("nav.home")} />
          <p className="max-w-md leading-6">{t("footer.about")}</p>
          <p className="text-xs text-text-3">© 2026 Mert Eldemir</p>
        </div>
        <nav aria-label={t("footer.label")} className="flex flex-wrap gap-x-6 gap-y-2 sm:pt-1">
          {LINKS.map(({ labelKey, route }) => (
            <Link key={route} href={route} className={LINK}>
              {t(labelKey)}
            </Link>
          ))}
          <a href={SOURCE_URL} className={LINK}>
            {t("footer.source")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
