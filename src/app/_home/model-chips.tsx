import Link from "next/link";

import { SparkleIcon } from "@/components/icons";
import { MODELS, type ModelId } from "@/lib/credits";

const PILL = "flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium";

export function ModelChips() {
  return (
    <ul
      aria-label="Models"
      className="-mx-4 flex gap-2 self-stretch overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:justify-center sm:px-0"
    >
      {(Object.keys(MODELS) as ModelId[]).map((id) => (
        <li key={id} className="shrink-0">
          <Link
            href={`/image?model=${id}`}
            className={`${PILL} border-border-3 bg-bg-1 transition-colors duration-150 hover:border-accent/50 hover:bg-bg-3`}
          >
            <SparkleIcon gradient className="size-3.5" />
            {MODELS[id].label}
            <span className="text-text-2 tabular-nums">{MODELS[id].credits} credits</span>
          </Link>
        </li>
      ))}
      <li className="shrink-0">
        <span aria-disabled="true" className={`${PILL} cursor-not-allowed border-border-1 text-text-3`}>
          Video
          <span className="flex h-4 items-center rounded-xs bg-accent-badge-bg px-1 text-[10px] leading-3 font-semibold text-accent-text">
            Soon
          </span>
        </span>
      </li>
    </ul>
  );
}
