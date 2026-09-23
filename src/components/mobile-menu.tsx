"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";

import { LogoMark, MenuIcon, XIcon } from "./icons";
import { isActive, LINKS, SOON_BADGE } from "./nav-links";

// Below md the nav row is hidden; this sheet carries the full list, Soon items included.
export function MobileMenu() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-bg-3 text-text-2 transition-colors duration-150 hover:bg-bg-5 hover:text-text-1 md:hidden"
      >
        <MenuIcon className="size-4.5" />
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-bg-1 p-0 text-text-1 backdrop:bg-overlay open:motion-safe:animate-fade-in md:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-13 shrink-0 items-center justify-between border-b border-border-1 px-4">
            <LogoMark className="size-7" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex size-8 items-center justify-center rounded-full bg-bg-3 text-text-2 transition-colors duration-150 hover:bg-bg-5 hover:text-text-1"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            {LINKS.map((link) => {
              const active = isActive(link.route, pathname);
              return (
                <Fragment key={link.label}>
                  {link.groupStart && <li aria-hidden className="mx-3 my-2 h-px bg-border-1" />}
                  <li>
                    {link.route ? (
                      <Link
                        href={link.route}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex h-12 items-center rounded-lg px-3 text-base font-medium transition-colors duration-150 ${
                          active ? "bg-bg-3 text-accent-text" : "text-text-1 hover:bg-bg-2"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span
                        aria-disabled
                        className="flex h-12 cursor-not-allowed items-center gap-2 px-3 text-base font-medium text-text-disabled"
                      >
                        {link.label}
                        {SOON_BADGE}
                      </span>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>
  );
}
