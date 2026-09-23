"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { LOCALE_COOKIE, makeT, type Locale, type T } from "@/lib/i18n";

type LocaleState = { locale: Locale; t: T; setLocale: (next: Locale) => void };

const LocaleContext = createContext<LocaleState | null>(null);

export function useLocale(): LocaleState {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}

export function useT(): T {
  return useLocale().t;
}

// The locale comes from the layout, which read the cookie; a switch writes the cookie and
// refreshes so server components re-render in the new language without losing client state.
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      router.refresh();
    },
    [locale, router],
  );

  const value = useMemo(() => ({ locale, t: makeT(locale), setLocale }), [locale, setLocale]);

  return <LocaleContext value={value}>{children}</LocaleContext>;
}
