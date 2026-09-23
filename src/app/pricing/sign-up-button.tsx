"use client";

import type { ReactNode } from "react";

import { useApp } from "@/components/app-provider";
import { CheckIcon } from "@/components/icons";
import { UPGRADE_BONUS } from "@/lib/credits";

export function SignUpButton({ className, children }: { className: string; children: ReactNode }) {
  const { account, openAuthModal } = useApp();
  // Already upgraded: the bonus is on their balance, so the button would only open a modal that does nothing.
  if (account?.status === "member") {
    return (
      <p className="mt-6 flex h-10 items-center gap-2 text-sm font-medium text-accent-text">
        <CheckIcon className="size-4" />
        You&apos;re signed up. Your {UPGRADE_BONUS} bonus credits are on your balance.
      </p>
    );
  }
  return (
    <button type="button" onClick={() => openAuthModal("signup")} className={className}>
      {children}
    </button>
  );
}
