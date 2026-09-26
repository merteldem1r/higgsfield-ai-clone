import type { Look } from "@/lib/look";
import { ensureSession, restartSession } from "@/lib/supabase/session";

export type LookOutcome = ({ ok: true } & Look) | { ok: false; code: string };

function post(ids: string[], signal: AbortSignal) {
  return fetch("/api/prompter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
    signal,
  });
}

// Same session handling as requestImprovedPrompt. Network failures come back as NETWORK, aborts rethrow.
export async function requestLook(ids: string[], signal: AbortSignal): Promise<LookOutcome> {
  try {
    await ensureSession();
    let res = await post(ids, signal);
    if (res.status === 401) {
      await restartSession();
      res = await post(ids, signal);
    }
    const body = (await res.json().catch(() => null)) as (Partial<Look> & { code?: unknown }) | null;
    if (res.ok && Array.isArray(body?.look) && Array.isArray(body?.subjects)) {
      return { ok: true, look: body.look, subjects: body.subjects };
    }
    return { ok: false, code: typeof body?.code === "string" ? body.code : "UNKNOWN" };
  } catch (err) {
    if (signal.aborted) throw err;
    return { ok: false, code: "NETWORK" };
  }
}
