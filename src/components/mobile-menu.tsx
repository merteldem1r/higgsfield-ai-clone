"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useApp } from "./app-provider";
import { MenuIcon, XIcon } from "./icons";
import { useT } from "./locale-provider";
import { LocaleList } from "./locale-switcher";
import { isActive, LINKS } from "./nav-data";
import { Wordmark } from "./wordmark";

// Below md the link row is hidden; this sheet carries the same four links, the language and sign-in.
export function MobileMenu() {
  const pathname = usePathname();
  const { account, openAuthModal } = useApp();
  const t = useT();
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
        aria-label={t("nav.openMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-2 transition-colors duration-150 hover:bg-bg-2 hover:text-text-1 md:hidden"
      >
        <MenuIcon className="size-4.5" />
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-label={t("nav.menu")}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-bg-0 p-0 text-text-1 backdrop:bg-overlay open:motion-safe:animate-fade-in md:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line-1 px-4">
            <Wordmark label={t("nav.home")} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("nav.closeMenu")}
              className="flex size-8 items-center justify-center rounded-md text-text-2 transition-colors duration-150 hover:bg-bg-2 hover:text-text-1"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            {LINKS.map(({ labelKey, route }) => {
              const active = isActive(route, pathname);
              return (
                <li key={route}>
                  <Link
                    href={route}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-12 items-center rounded-lg px-3 text-base font-medium transition-colors duration-150 ${
                      active ? "bg-bg-2 text-text-1" : "text-text-2 hover:bg-bg-1 hover:text-text-1"
                    }`}
                  >
                    {t(labelKey)}
                  </Link>
                </li>
              );
            })}
            {account !== null && account.status !== "member" && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openAuthModal("login");
                  }}
                  className="flex h-12 w-full items-center rounded-lg px-3 text-left text-base font-medium text-text-2 transition-colors duration-150 hover:bg-bg-1 hover:text-text-1"
                >
                  {t("auth.login")}
                </button>
              </li>
            )}
            <li aria-hidden className="mx-3 my-2 h-px bg-line-1" />
            <li>
              <LocaleList />
            </li>
          </ul>
        </div>
      </dialog>
    </>
  );
}
