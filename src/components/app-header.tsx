import Link from "next/link";

import { getT } from "@/lib/i18n/server";

import { AuthButtons } from "./auth-buttons";
import { CreditsPill } from "./credits-pill";
import { DiamondIcon, LogoMark, SparkleOutlineIcon } from "./icons";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";
import { PromoBanner } from "./promo-banner";
import { ToastViewport } from "./toast-viewport";

export async function AppHeader() {
  const t = await getT();
  return (
    <header className="sticky top-0 z-40">
      <PromoBanner />
      <nav aria-label={t("nav.main")} className="flex h-13 items-center gap-6 bg-bg-0 px-4 sm:px-6">
        <Link href="/" aria-label={t("nav.home")} className="shrink-0">
          <LogoMark className="size-7" />
        </Link>
        <NavLinks />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href="/pricing"
            className="relative flex h-8 items-center gap-1.5 rounded-md bg-bg-3 px-3 text-sm font-medium transition-colors duration-150 hover:bg-bg-5 max-md:hidden"
          >
            <DiamondIcon className="size-3.5" />
            {t("nav.pricing")}
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-xs bg-brand-pink px-1 text-[9px] leading-3 font-bold whitespace-nowrap text-accent-ink italic">
              {t("nav.discount")}
            </span>
          </Link>
          {/* Display-only for now: both lead to Explore until there's a page behind them. */}
          <Link
            href="/"
            className="flex h-8 items-center gap-1.5 rounded-md bg-bg-3 px-3 text-sm font-medium transition-colors duration-150 hover:bg-bg-5 max-xl:hidden"
          >
            <SparkleOutlineIcon className="size-3.5" />
            {t("nav.enterprise")}
          </Link>
          <LocaleSwitcher className="max-md:hidden" />
          <span aria-hidden className="mx-1 h-4 w-px bg-border-3 max-md:hidden" />
          <CreditsPill />
          <AuthButtons />
          <MobileMenu />
        </div>
      </nav>
      <ToastViewport />
    </header>
  );
}
