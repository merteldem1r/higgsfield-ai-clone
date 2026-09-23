"use client";

import { useRouter } from "next/navigation";
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

/**
 * guest: no session yet (hasn't generated). anonymous: a session with no email.
 * member: added an email + password, or logged in. null while the first read is in flight.
 */
export type Account =
  | { status: "guest" }
  | { status: "anonymous" }
  | { status: "member"; email: string; handle: string | null };

type AppState = {
  account: Account | null;
  /** Re-reads the session and balance, e.g. after sign-up, login or logout. */
  refreshAccount: () => Promise<void>;
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

async function readAccount(): Promise<{ account: Account; credits: number }> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getSession();
  // No session yet means the visitor hasn't generated; the signup trigger will grant this much.
  if (!auth.session) return { account: { status: "guest" }, credits: FREE_CREDITS };
  const { user } = auth.session;
  const { data, error } = await supabase
    .from("profiles")
    .select("credits, handle")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  const account: Account =
    user.is_anonymous || !user.email
      ? { status: "anonymous" }
      : { status: "member", email: user.email, handle: data?.handle ?? null };
  // A session without a profile gets replaced on the next Generate (NO_PROFILE), which grants a fresh balance.
  return { account, credits: data?.credits ?? FREE_CREDITS };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [authModal, setAuthModal] = useState<AuthModalVariant | null>(null);
  const toastId = useRef(0);

  const refreshAccount = useCallback(async () => {
    try {
      const next = await readAccount();
      setAccount(next.account);
      setCredits(next.credits);
    } catch (err) {
      console.error("Reading the account failed", err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    readAccount()
      .then((next) => {
        if (cancelled) return;
        setAccount(next.account);
        setCredits(next.credits);
      })
      .catch((err) => console.error("Reading the account failed", err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Covers every transition, including the lazy anonymous sign-in on the first Generate.
  // Deferred because supabase-js holds its auth lock while this callback runs, and awaiting
  // another auth call (getSession inside readAccount) from inside it can deadlock.
  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => void refreshAccount(), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refreshAccount]);

  // Signed in: the upsell modal has nothing to offer, so running out goes to Pricing instead (docs/PLAN.md).
  const openAuthModal = useCallback(
    (variant: AuthModalVariant) => {
      if (account?.status === "member") {
        if (variant === "out-of-credits") router.push("/pricing");
        return;
      }
      setAuthModal(variant);
    },
    [account, router],
  );

  const showToast = useCallback((next: Omit<Toast, "id">) => {
    toastId.current += 1;
    setToast({ ...next, id: toastId.current });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      account,
      refreshAccount,
      credits,
      setCredits,
      refreshCredits: refreshAccount,
      toast,
      showToast,
      dismissToast: () => setToast(null),
      authModal,
      openAuthModal,
      closeAuthModal: () => setAuthModal(null),
    }),
    [account, refreshAccount, credits, toast, showToast, authModal, openAuthModal],
  );

  return <AppContext value={value}>{children}</AppContext>;
}
