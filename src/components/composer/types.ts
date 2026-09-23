import type { AspectId, ModelId } from "@/lib/credits";

export type GenerateRequest = { prompt: string; model: ModelId; aspect: AspectId; batch: number };
