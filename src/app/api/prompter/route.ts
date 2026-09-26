import { NextResponse } from "next/server";

import { SHOWCASE } from "@/components/showcase";
import { findLook } from "@/lib/fal";
import { hashClientIp, PROMPT_HELP_DAILY_LIMIT } from "@/lib/ip";
import { MAX_PICKS, showcaseId, type Look, type LookPhrase } from "@/lib/look";
import { createAdminClient, getUserId } from "@/lib/supabase/server";

export const maxDuration = 20;

const TIMEOUT_MS = 15_000;
const MAX_PHRASES = 6;
const SUBJECTS = 3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STOP_WORDS = new Set(["with", "from", "into", "onto", "over", "under", "through", "across", "between", "while", "very"]);

type StartResult = { ok: true; remaining: number } | { ok: false; code: "IP_LIMIT" };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

function readIds(body: unknown): string[] | null {
  const ids = typeof body === "object" && body !== null ? (body as { ids?: unknown }).ids : undefined;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_PICKS) return null;
  if (!ids.every((id): id is string => typeof id === "string")) return null;
  return new Set(ids).size === ids.length ? ids : null;
}

// The request names images, never text: the input is a closed set of our own prompts, so this route can't be
// used as a free general-purpose LLM. Only featured generations resolve, so no one else's prompt can be read.
async function resolvePrompts(ids: string[]): Promise<string[] | null> {
  const prompts = new Map(SHOWCASE.map((item) => [showcaseId(item.src), item.prompt]));
  const generationIds = ids.filter((id) => UUID.test(id));
  if (generationIds.length > 0) {
    const { data, error } = await createAdminClient()
      .from("generations")
      .select("id, prompt")
      .in("id", generationIds)
      .eq("featured", true)
      .eq("status", "succeeded");
    if (error) throw error;
    for (const row of data as { id: string; prompt: string }[]) prompts.set(row.id, row.prompt);
  }
  const resolved = ids.map((id) => prompts.get(id));
  return resolved.every((prompt): prompt is string => prompt !== undefined) ? resolved : null;
}

// Items become the middle of a prompt, so a sentence-case capital goes (an acronym like "VHS" stays).
function clean(line: string): string {
  const text = line
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
    .replace(/^["'“”]+|["'“”.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return /^\p{Lu}(?:\p{Ll}|\s)/u.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
}

const words = (text: string) => (text.toLowerCase().match(/\p{L}{4,}/gu) ?? []).filter((word) => !STOP_WORDS.has(word));

// Matching on a shared start, so "reflections" traces to "reflecting" and "glow" to "glowing".
const related = (a: string, b: string) => a.startsWith(b.slice(0, 5)) || b.startsWith(a.slice(0, 5));

function parseLook(raw: string, prompts: string[]): Look | null {
  const sections = { look: [] as string[], subjects: [] as string[] };
  let current: keyof typeof sections | null = null;
  for (const line of raw.split("\n")) {
    const header = line.match(/^\W*(look|subjects?)\W*:\s*(.*)$/i);
    if (header) {
      current = header[1].toLowerCase() === "look" ? "look" : "subjects";
      // Some replies put the items on the header line instead of under it.
      if (header[2].trim()) sections[current].push(...header[2].split(";"));
      continue;
    }
    if (current && line.trim()) sections[current].push(line);
  }

  const promptWords = prompts.map(words);
  const seen = new Set<string>();
  const look: LookPhrase[] = [];
  for (const text of sections.look.map(clean)) {
    const key = text.toLowerCase();
    if (text.length < 2 || text.length > 60 || seen.has(key)) continue;
    // The page says the look comes from the prompts behind the picks, so a phrase that traces to none is dropped.
    const from = promptWords.flatMap((known, i) => (words(text).some((w) => known.some((k) => related(w, k))) ? [i] : []));
    if (from.length === 0) continue;
    seen.add(key);
    look.push({ text, from });
  }

  const subjects = [...new Set(sections.subjects.map(clean))].filter((s) => s.length >= 3 && s.length <= 120);
  if (look.length < 2 || subjects.length === 0) return null;
  return { look: look.slice(0, MAX_PHRASES), subjects: subjects.slice(0, SUBJECTS) };
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return errorResponse(401, "UNAUTHENTICATED", "Sign in to find a look.");

  const ids = readIds(await request.json().catch(() => null));
  if (!ids) return errorResponse(400, "INVALID_INPUT", `Pick 1–${MAX_PICKS} different images.`);

  let prompts: string[] | null;
  try {
    prompts = await resolvePrompts(ids);
  } catch (err) {
    console.error("Resolving prompter picks failed", err);
    return errorResponse(500, "INTERNAL", "Couldn't read those images.");
  }
  // Checked before the allowance is spent: a stale pick is the page's problem, not the visitor's.
  if (!prompts) return errorResponse(400, "UNKNOWN_IMAGE", "One of those images isn't available any more.");

  const { data: started, error: startError } = await createAdminClient().rpc("start_prompt_improvement", {
    p_user_id: userId,
    p_ip_hash: hashClientIp(request),
    p_daily_limit: PROMPT_HELP_DAILY_LIMIT,
  });
  if (startError) {
    console.error("start_prompt_improvement failed", startError);
    return errorResponse(500, "INTERNAL", "Couldn't find a look.");
  }
  const start = started as StartResult;
  if (!start.ok) {
    return errorResponse(429, "IP_LIMIT", "Daily prompt help limit reached for your network. Try again tomorrow.");
  }

  try {
    const look = parseLook(await findLook(prompts, AbortSignal.timeout(TIMEOUT_MS)), prompts);
    if (!look) return errorResponse(502, "PROVIDER_ERROR", "The model's answer wasn't usable. Try again.");
    return NextResponse.json({ ...look, remaining: start.remaining });
  } catch (err) {
    console.error("Finding a look failed", err);
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return timedOut
      ? errorResponse(504, "TIMEOUT", "The model took too long. Try again.")
      : errorResponse(502, "PROVIDER_ERROR", "Couldn't find a look. Try again.");
  }
}
