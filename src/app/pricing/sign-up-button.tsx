"use client";

import { useApp } from "@/components/app-provider";

export function SignUpButton({ className, children }: { className: string; children: string }) {
  const { openAuthModal } = useApp();
  return (
    <button type="button" onClick={() => openAuthModal("signup")} className={className}>
      {children}
    </button>
  );
}
