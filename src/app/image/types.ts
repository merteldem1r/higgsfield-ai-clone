import type { GenerateRequest } from "@/components/composer/types";

export type { GenerateRequest };

// id is missing only if the server couldn't read it back after saving; that image just shows no heart.
export type RunImage = { id?: string; url: string; width: number | null; height: number | null; favourite: boolean };

// One click of Generate, rendered as one chat turn: the user's bubble, then the assistant's reply.
// "rejected" means the API turned it down before spending (budget, IP limit, credits, network).
export type Run = {
  id: string;
  request: GenerateRequest;
  status: "pending" | "done" | "failed" | "rejected";
  startedAt: number;
  completedAt?: number;
  images: RunImage[];
  /** Balance right after this run. Only known for runs made in this page visit. */
  creditsLeft?: number;
  /** Created in this page visit, so its reply streams in; history renders instantly. */
  live: boolean;
  rejection?: { code: string; message: string };
};
