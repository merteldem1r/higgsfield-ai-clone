import type { GenerateRequest } from "@/components/composer/types";

export type { GenerateRequest };

export type RunImage = { url: string; width: number | null; height: number | null };

// One click of Generate. A batch renders as `batch` pending tiles, then its images or one failed tile.
export type Run = {
  id: string;
  request: GenerateRequest;
  status: "pending" | "done" | "failed";
  startedAt: number;
  images: RunImage[];
};

export type Notice = { tone: "danger" | "neutral"; text: string; link?: { href: string; label: string } };
