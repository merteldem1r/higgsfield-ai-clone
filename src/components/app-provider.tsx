"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { FREE_CREDITS } from "@/lib/credits";
import { createClient } from "@/lib/supabase/client";

export type ToastTone = "danger" | "neutral";
export type Toast = {
  id: number;
  tone: ToastTone;
  text: string;
  action?: { label: string; onClick: () => void };
};
export type AuthModalVariant = "login" | "signup" | "out-of-credits";

type AppState = {
  /** null while the first balance read is in flight. */
  credits: number | null;
  setCredits: (credits: number) => void;
  refreshCredits: () => Promise<void>;
  toast: Toast | null;
  showToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: () => void;
  authModal: AuthModalVariant | null;
  openAuthModal: (variant: AuthModalVariant) => void;
  closeAuthModal: () => void;
};

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

async function readBalance(): Promise<number> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getSession();
  // No session yet means the visitor hasn't generated; the signup trigger will grant this much.
  if (!auth.session) return FREE_CREDITS;
  const { data, error } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", auth.session.user.id)
    .maybeSingle();
  if (error) throw error;
  // A session without a profile gets replaced on the next Generate (NO_PROFILE), which grants a fresh balance.
  return data?.credits ?? FREE_CREDITS;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [authModal, setAuthModal] = useState<AuthModalVariant | null>(null);
  const toastId = useRef(0);

  const refreshCredits = useCallback(async () => {
    try {
      setCredits(await readBalance());
    } catch (err) {
      console.error("Reading credits failed", err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    readBalance()
      .then((balance) => {
        if (!cancelled) setCredits(balance);
      })
      .catch((err) => console.error("Reading credits failed", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = useCallback((next: Omit<Toast, "id">) => {
    toastId.current += 1;
    setToast({ ...next, id: toastId.current });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      credits,
      setCredits,
      refreshCredits,
      toast,
      showToast,
      dismissToast: () => setToast(null),
      authModal,
      openAuthModal: setAuthModal,
      closeAuthModal: () => setAuthModal(null),
    }),
    [credits, refreshCredits, toast, showToast, authModal],
  );

  return <AppContext value={value}>{children}</AppContext>;
}
