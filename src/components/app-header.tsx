import Link from "next/link";

import { CreditsPill } from "./credits-pill";
import { DiamondIcon, LogoMark } from "./icons";
import { NavLinks } from "./nav-links";
import { PromoBanner } from "./promo-banner";
import { ToastViewport } from "./toast-viewport";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40">
      <PromoBanner />
      <nav aria-label="Main" className="flex h-13 items-center gap-6 bg-bg-0 px-4 sm:px-6">
        <Link href="/" aria-label="Home" className="shrink-0">
          <LogoMark className="size-7" />
        </Link>
        <NavLinks />

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/pricing"
            className="relative flex h-8 items-center gap-1.5 rounded-md bg-bg-3 px-3 text-sm font-medium transition-colors duration-150 hover:bg-bg-5 max-sm:hidden"
          >
            <DiamondIcon className="size-3.5" />
            Pricing
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-xs bg-brand-pink px-1 text-[9px] leading-3 font-bold whitespace-nowrap text-accent-ink italic">
              30% OFF
            </span>
          </Link>
          <CreditsPill />
          {/* Wired to the auth modal in step 4. */}
          <button
            type="button"
            className="flex h-8 items-center rounded-md bg-accent-tint-2 px-3 text-sm font-medium text-accent-text transition-colors duration-150 hover:bg-accent-badge-bg max-sm:hidden"
          >
            Login
          </button>
          <button
            type="button"
            className="flex h-8 items-center rounded-md bg-brand-gradient px-3 text-sm font-semibold text-accent-ink transition-[filter] duration-150 hover:brightness-110"
          >
            Sign up
          </button>
        </div>
      </nav>
      <ToastViewport />
    </header>
  );
}
