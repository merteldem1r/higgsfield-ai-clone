// Imported by /prompter and /api/prompter, so the picker and the server agree on the rules.

export const MAX_PICKS = 3;

/** One phrase of the look, with the picks (by position in the request) whose prompts it came from. */
export type LookPhrase = { text: string; from: number[] };

export type Look = { look: LookPhrase[]; subjects: string[] };

// Featured images are keyed by generation id. Showcase images live in code, so they're keyed by file name.
export function showcaseId(src: string): string {
  return `showcase:${src.slice(src.lastIndexOf("/") + 1, src.lastIndexOf("."))}`;
}
