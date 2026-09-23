import { createClient } from "./client";

// Signed in lazily on the first Generate, not on page load, so crawlers and bounces never create users.
export async function ensureSession(): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`Couldn't start a session: ${error.message}`);
}

// For UNAUTHENTICATED / NO_PROFILE: the stored session is dead, so drop it and start a fresh one.
export async function restartSession(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut({ scope: "local" });
  await ensureSession();
}

export async function hasSession(): Promise<boolean> {
  const { data } = await createClient().auth.getSession();
  return data.session !== null;
}

/** granted: this call paid the upgrade bonus. credits: the balance after, or null if it couldn't be read. */
export type AuthOutcome =
  | { ok: true; granted: boolean; credits: number | null }
  | { ok: false; code: string; message: string };

function failure(error: { code?: string; message: string }): AuthOutcome {
  const code = error.code ?? "unknown";
  const message: Record<string, string> = {
    email_exists: "That email already has an account.",
    user_already_exists: "That email already has an account.",
    invalid_credentials: "Wrong email or password.",
    weak_password: "Pick a stronger password.",
    email_address_invalid: "That email address isn't valid.",
    over_request_rate_limit: "Too many attempts. Wait a minute and try again.",
  };
  return { ok: false, code, message: message[code] ?? error.message };
}

// Idempotent on the server, so it's also called after every login: a bonus lost to a network error on
// signup gets paid the next time.
async function claimUpgradeBonus(): Promise<{ granted: boolean; credits: number | null }> {
  try {
    const res = await fetch("/api/account/upgrade-bonus", { method: "POST" });
    if (!res.ok) return { granted: false, credits: null };
    const body = (await res.json()) as { granted?: boolean; credits?: number };
    return { granted: body.granted === true, credits: typeof body.credits === "number" ? body.credits : null };
  } catch {
    return { granted: false, credits: null };
  }
}

// Sign up = upgrade the current anonymous user in place. The user id stays the same, so every
// generation, asset and favourite already belongs to the new account; nothing is copied.
// A visitor who hasn't generated yet gets an anonymous session first, so there's one path.
export async function signUpWithEmail(email: string, password: string): Promise<AuthOutcome> {
  await ensureSession();
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ email, password });
  if (error) return failure(error);
  return { ok: true, ...(await claimUpgradeBonus()) };
}

// Replaces the current session. A guest session's images stay with that guest user (the UI says so).
export async function logInWithEmail(email: string, password: string): Promise<AuthOutcome> {
  const { error } = await createClient().auth.signInWithPassword({ email, password });
  if (error) return failure(error);
  return { ok: true, ...(await claimUpgradeBonus()) };
}

export async function logOut(): Promise<void> {
  await createClient().auth.signOut({ scope: "local" });
}
