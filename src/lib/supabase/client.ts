import { createBrowserClient } from "@supabase/ssr";

// Publishable key only. RLS limits it to SELECT on the caller's own rows.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
