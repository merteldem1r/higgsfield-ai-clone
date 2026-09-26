import Link from "next/link";

import { LogoMark } from "./icons";

// The mark and the name, as one link home. Used by the header, the footer and the mobile sheet.
export function Wordmark({ label, className = "" }: { label: string; className?: string }) {
  return (
    <Link href="/" aria-label={label} className={`flex shrink-0 items-center gap-2 rounded-sm ${className}`}>
      <LogoMark className="size-6" />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-text-1">Darkroom</span>
    </Link>
  );
}
