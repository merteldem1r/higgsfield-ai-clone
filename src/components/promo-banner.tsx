"use client";

import Link from "next/link";
import { useState } from "react";

import { FREE_CREDITS } from "@/lib/credits";

import { TagIcon, XIcon } from "./icons";
import { useT } from "./locale-provider";
import { BANNER_STORAGE_KEY } from "./promo-banner-key";

export function PromoBanner() {
  const [closing, setClosing] = useState(false);
  const t = useT();

  function dismiss() {
    setClosing(true);
    try {
      localStorage.setItem(BANNER_STORAGE_KEY, "1");
    } catch {
      // Private mode: the banner just comes back on the next visit.
    }
  }

  return (
    <div
      data-promo-banner
      onTransitionEnd={() => {
        if (closing) document.documentElement.dataset.banner = "dismissed";
      }}
      className={`relative overflow-hidden border-b border-border-1 bg-bg-1 transition-[height,opacity] duration-200 ${
        closing ? "h-0 opacity-0" : "h-11"
      }`}
    >
      <div className="flex h-11 items-center justify-center gap-2 pr-12 pl-4 sm:gap-3">
        <TagIcon className="size-4 shrink-0 text-accent" />
        <p className="truncate text-xs font-semibold text-brand-gradient sm:text-sm">
          {t("banner.text", { n: FREE_CREDITS })}
          <span className="max-sm:hidden">{t("banner.noSignup")}</span>
        </p>
        <Link
          href="/image"
          className="flex h-6.5 shrink-0 items-center rounded-sm bg-brand-gradient px-2.5 text-xs font-semibold text-accent-ink transition-[filter] duration-150 hover:brightness-110"
        >
          {t("banner.cta")}
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("banner.dismiss")}
        className="absolute top-1/2 right-4 -translate-y-1/2 rounded-sm p-1 text-text-2 transition-colors duration-150 hover:bg-bg-3 hover:text-text-1"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
