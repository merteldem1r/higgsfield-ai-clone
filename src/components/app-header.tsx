import { getT } from "@/lib/i18n/server";

import { AuthButtons } from "./auth-buttons";
import { CreditsPill } from "./credits-pill";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";
import { ToastViewport } from "./toast-viewport";
import { Wordmark } from "./wordmark";

export async function AppHeader() {
  const t = await getT();
  return (
    <header className="sticky top-0 z-40 border-b border-line-1 bg-bg-0/85 backdrop-blur-md">
      <nav aria-label={t("nav.main")} className="mx-auto flex h-14 w-full max-w-360 items-center gap-8 px-4 sm:px-6">
        <Wordmark label={t("nav.home")} />
        <NavLinks />

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <CreditsPill />
          <LocaleSwitcher className="max-md:hidden" />
          <span aria-hidden className="mx-1 h-4 w-px bg-line-2 max-md:hidden" />
          <AuthButtons />
          <MobileMenu />
        </div>
      </nav>
      <ToastViewport />
    </header>
  );
}
