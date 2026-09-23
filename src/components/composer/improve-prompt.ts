import { ensureSession, restartSession } from "@/lib/supabase/session";

export type ImproveOutcome = { ok: true; prompt: string } | { ok: false; code: string };

function post(prompt: string, signal: AbortSignal) {
  return fetch("/api/improve-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal,
  });
}

// Same session handling as requestGeneration. Network failures come back as NETWORK, aborts rethrow.
export async function requestImprovedPrompt(prompt: string, signal: AbortSignal): Promise<ImproveOutcome> {
  try {
    await ensureSession();
    let res = await post(prompt, signal);
    if (res.status === 401) {
      await restartSession();
      res = await post(prompt, signal);
    }
    const body = (await res.json().catch(() => null)) as { prompt?: unknown; code?: unknown } | null;
    if (res.ok && typeof body?.prompt === "string") return { ok: true, prompt: body.prompt };
    return { ok: false, code: typeof body?.code === "string" ? body.code : "UNKNOWN" };
  } catch (err) {
    if (signal.aborted) throw err;
    return { ok: false, code: "NETWORK" };
  }
}
