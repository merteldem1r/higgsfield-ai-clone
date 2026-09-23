import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

// Acts as the caller (publishable key + their session cookies). Only used to identify them.
async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}

// getUser() asks the Auth server rather than trusting the token locally, so a
// revoked session can't spend credits. A Bearer header is accepted too, which
// lets the credit checks be run with curl.
export async function getUserId(request: Request): Promise<string | null> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser(bearer);
  if (error || !data.user) return null;
  return data.user.id;
}

// Secret key: bypasses RLS. The only client that can call the credit functions.
export function createAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
