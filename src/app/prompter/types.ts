import type { AspectId } from "@/lib/credits";
import type { LookPhrase } from "@/lib/look";

/** An image the visitor can pick: one of ours, with the exact prompt that made it. */
export type PoolItem = {
  id: string;
  src: string;
  prompt: string;
  /** Known for showcase images; featured ones are measured when they load. */
  size: { width: number; height: number } | null;
};

export type Pick = { item: PoolItem; aspect: AspectId };

export type LookResult = {
  id: string;
  at: number;
  seconds: number;
  /** The picks as they were when this look was asked for; the bench may have moved on since. */
  picks: Pick[];
  look: LookPhrase[];
  subjects: string[];
  /** Indexes into `look` the visitor switched off. */
  off: number[];
};
