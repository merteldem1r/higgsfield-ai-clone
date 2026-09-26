import type { GenerateRequest } from "@/components/composer/types";

export type { GenerateRequest };

// id is missing only if the server couldn't read it back after saving; that image just shows no heart.
export type RunImage = { id?: string; url: string; width: number | null; height: number | null; favourite: boolean };

// One click of Generate, shown as one frame. Requests the API rejected before spending anything never
// become runs: they're shown as a notice in the composer instead.
export type Run = {
  id: string;
  request: GenerateRequest;
  status: "pending" | "done" | "failed";
  startedAt: number;
  completedAt?: number;
  images: RunImage[];
  /** Created in this page visit: its image crossfades in on arrival; history renders as it loads. */
  live: boolean;
  /** A failed run that has been retried collapses to a one-line record. */
  retried?: boolean;
};

export type Rejection = { code: string; message: string; request: GenerateRequest };
