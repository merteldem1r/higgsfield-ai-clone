import Link from "next/link";

import { AlertIcon, XIcon } from "@/components/icons";

import type { Notice } from "./types";

const TONE = {
  danger: { box: "border-danger/40 bg-danger/12", icon: "text-danger" },
  neutral: { box: "border-border-3 bg-bg-1", icon: "text-text-2" },
};

export function NoticeBar({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const tone = TONE[notice.tone];
  return (
    <div
      role="status"
      className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 py-2 shadow-float motion-safe:animate-rise-in motion-reduce:animate-fade-in ${tone.box}`}
    >
      <AlertIcon className={`size-4 shrink-0 ${tone.icon}`} />
      <p className="flex-1 text-sm font-medium text-text-1">{notice.text}</p>
      {notice.link && (
        <Link href={notice.link.href} className="shrink-0 text-[13px] font-semibold text-accent-text hover:text-accent-hover">
          {notice.link.label}
        </Link>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-sm p-0.5 text-text-2 transition-colors duration-150 hover:text-text-1"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
