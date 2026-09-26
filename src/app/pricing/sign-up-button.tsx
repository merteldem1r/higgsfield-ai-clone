"use client";

import type { ReactNode } from "react";

import { useApp } from "@/components/app-provider";
import { CheckIcon } from "@/components/icons";
import { useT } from "@/components/locale-provider";
import { UPGRADE_BONUS } from "@/lib/credits";

export function SignUpButton({ className, children }: { className: string; children: ReactNode }) {
  const { account, openAuthModal } = useApp();
  const t = useT();
  // Already upgraded: the bonus is on their balance, so the button would only open a modal that does nothing.
  if (account?.status === "member") {
    return (
      <p className="flex h-9 shrink-0 items-center gap-2 text-sm font-medium text-text-1">
        <CheckIcon className="size-4" />
        {t("pricing.signedUp", { n: UPGRADE_BONUS })}
      </p>
    );
  }
  return (
    <button type="button" onClick={() => openAuthModal("signup")} className={className}>
      {children}
    </button>
  );
}
