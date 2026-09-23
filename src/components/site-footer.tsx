import Link from "next/link";

import { LogoMark } from "@/components/icons";

const LINK = "transition-colors duration-150 hover:text-text-1";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border-1">
      <div className="mx-auto flex w-full max-w-360 flex-col gap-4 px-4 py-8 text-sm text-text-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <LogoMark className="size-6 shrink-0" />
          <p className="max-w-xl">
            © 2026. An independent clone built as a take-home demo. Not affiliated with or endorsed by Higgsfield.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-5">
          <Link href="/image" className={LINK}>
            Image
          </Link>
          <Link href="/assets" className={LINK}>
            Assets
          </Link>
          <a href="https://github.com/merteldem1r/higgsfield-ai-clone" className={LINK}>
            Source
          </a>
        </nav>
      </div>
    </footer>
  );
}
