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
