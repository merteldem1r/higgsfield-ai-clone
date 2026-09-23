"use client";

import { useState, type SubmitEvent } from "react";

import { DEFAULT_MODEL, MODELS } from "@/lib/credits";
import { createClient } from "@/lib/supabase/client";

type GenerateResult = {
  generationId: string;
  credits: number;
  images: { url: string; width: number | null; height: number | null }[];
};

type GenerateError = { code: string; message: string };

export function GenerateForm() {
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      // Signed in lazily here, not on page load, so crawlers and bounces never create users.
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw new Error(`Anonymous sign-in failed: ${signInError.message}`);
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const body: GenerateResult | GenerateError = await res.json();
      if (!res.ok || !("images" in body)) {
        const { code, message } = body as GenerateError;
        setError(`${code}: ${message}`);
        return;
      }
      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-start gap-2">
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={4}
        cols={60}
        placeholder="Describe an image"
        className="border border-border-3 bg-bg-2 p-2"
      />
      <button type="submit" disabled={pending || prompt.trim() === ""} className="border border-border-3 px-3 py-1">
        {pending ? "Generating…" : `Generate (${MODELS[DEFAULT_MODEL].credits} credits)`}
      </button>

      {error && <p role="alert">{error}</p>}

      {result && (
        <>
          <p>Credits left: {result.credits}</p>
          {result.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element -- already a final JPEG in Storage; no optimizer needed yet
            <img
              key={image.url}
              src={image.url}
              alt={prompt}
              width={image.width ?? undefined}
              height={image.height ?? undefined}
              className="max-w-lg"
            />
          ))}
        </>
      )}
    </form>
  );
}
