"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { LOCALE_NAMES, LOCALES } from "@/lib/i18n";

import { CheckIcon, GlobeIcon } from "./icons";
import { useLocale } from "./locale-provider";

// Same menu behaviour as the composer's ChipMenu, opening downward from the header.
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, t, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t("locale.label")}: ${LOCALE_NAMES[locale]}`}
        onClick={() => setOpen((o) => !o)}
        className={`relative flex size-8 items-center justify-center rounded-md bg-bg-3 transition-colors duration-150 hover:bg-bg-5 hover:text-text-1 ${
          open ? "text-text-1" : "text-text-2"
        }`}
      >
        <GlobeIcon className="size-4" />
        {/* A language code, not a flag: flags name countries, and English or Russian don't belong to one. */}
        <span
          aria-hidden
          className="absolute -right-1.5 -bottom-1.5 rounded-xs bg-bg-5 px-1 text-[9px] leading-3 font-bold text-text-1 uppercase ring-2 ring-bg-0"
        >
          {locale}
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={t("locale.label")}
          onKeyDown={onMenuKeyDown}
          className="absolute top-full right-0 z-50 mt-2 w-44 rounded-lg border border-border-3 bg-bg-1 p-1.5 shadow-float motion-safe:animate-pop-in motion-reduce:animate-fade-in"
        >
          {LOCALES.map((code) => {
            const checked = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                lang={code}
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                  setLocale(code);
                }}
                className="flex h-10 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm font-medium text-text-1 transition-colors duration-150 outline-none hover:bg-bg-3 focus-visible:bg-bg-3"
              >
                <span className="flex-1">{LOCALE_NAMES[code]}</span>
                <CheckIcon className={`size-4 shrink-0 text-accent-text ${checked ? "" : "invisible"}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// The mobile sheet already scrolls a list, so languages sit in it as a radio group rather than a nested menu.
export function LocaleList() {
  const { locale, t, setLocale } = useLocale();

  return (
    <div role="radiogroup" aria-label={t("locale.label")} className="px-3 py-2">
      <p className="flex items-center gap-2 pb-2 text-xs font-medium text-text-2">
        <GlobeIcon className="size-4" />
        {t("locale.label")}
      </p>
      <div className="flex gap-1 rounded-lg border border-border-3 bg-bg-2 p-1">
        {LOCALES.map((code) => {
          const checked = code === locale;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={checked}
              lang={code}
              onClick={() => setLocale(code)}
              className={`flex h-9 min-w-0 flex-1 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors duration-150 ${
                checked ? "bg-bg-5 text-text-1" : "text-text-2 hover:text-text-1"
              }`}
            >
              <span className="truncate">{LOCALE_NAMES[code]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
