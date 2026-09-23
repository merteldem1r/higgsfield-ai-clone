import Link from "next/link";

import { LogoMark } from "@/components/icons";
import { getT } from "@/lib/i18n/server";

const LINK = "transition-colors duration-150 hover:text-text-1";

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="mt-20 border-t border-border-1">
      <div className="mx-auto flex w-full max-w-360 flex-col gap-4 px-4 py-8 text-sm text-text-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <LogoMark className="size-6 shrink-0" />
          <p className="max-w-xl">{t("footer.disclaimer")}</p>
        </div>
        <nav aria-label={t("footer.label")} className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/image" className={LINK}>
            {t("nav.image")}
          </Link>
          <Link href="/assets" className={LINK}>
            {t("nav.assets")}
          </Link>
          <a href="https://github.com/merteldem1r/higgsfield-ai-clone" className={LINK}>
            {t("footer.source")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
