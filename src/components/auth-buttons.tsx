"use client";

import { useApp } from "./app-provider";

export function AuthButtons() {
  const { openAuthModal } = useApp();

  return (
    <>
      <button
        type="button"
        onClick={() => openAuthModal("login")}
        className="flex h-8 items-center rounded-md bg-accent-tint-2 px-3 text-sm font-medium text-accent-text transition-colors duration-150 hover:bg-accent-badge-bg max-sm:hidden"
      >
        Login
      </button>
      <button
        type="button"
        onClick={() => openAuthModal("signup")}
        className="flex h-8 items-center rounded-md bg-brand-gradient px-3 text-sm font-semibold text-accent-ink transition-[filter] duration-150 hover:brightness-110"
      >
        Sign up
      </button>
    </>
  );
}
