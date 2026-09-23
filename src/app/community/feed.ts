import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

const BUCKET = "generations";
const LIMIT = 200;

/**
 * Everything the browser gets about a community image. Built field by field from the row
 * below, so a column added to the select can't leak by accident. Never user_id, ip_hash
 * or anything credit-related.
 */
export type CommunityItem = {
  prompt: string;
  model: string;
  createdAt: string;
  handle: string;
  /** Public Storage URL. Its path contains the creator's user id: see "Known limitations". */
  url: string;
};

type FeaturedRow = {
  prompt: string;
  model: string;
  created_at: string;
  profiles: { handle: string } | null;
  assets: { storage_path: string }[];
};

// Service role on purpose: RLS keeps the browser on its own rows, and that rule stays as it is.
export async function loadCommunityFeed(): Promise<CommunityItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("generations")
    .select("prompt, model, created_at, profiles(handle), assets(storage_path)")
    .eq("featured", true)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) throw error;

  return (data as unknown as FeaturedRow[]).flatMap((row) =>
    row.assets
      .toSorted((a, b) => a.storage_path.localeCompare(b.storage_path))
      .map((asset) => ({
        prompt: row.prompt,
        model: row.model,
        createdAt: row.created_at,
        handle: row.profiles?.handle ?? "anonymous",
        url: admin.storage.from(BUCKET).getPublicUrl(asset.storage_path).data.publicUrl,
      })),
  );
}
