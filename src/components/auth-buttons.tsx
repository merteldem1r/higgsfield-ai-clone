"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { FREE_CREDITS, MODELS, UPGRADE_BONUS } from "@/lib/credits";
import { logOut } from "@/lib/supabase/session";

import { LOCALE_NAMES, LOCALES } from "@/lib/i18n";

import { useApp } from "./app-provider";
import {
  BoxIcon,
  BrandGradient,
  CheckIcon,
  ChevronRightIcon,
  GlobeIcon,
  HelpIcon,
  LogOutIcon,
  SpinnerIcon,
  UsersIcon,
} from "./icons";
import { useLocale, useT } from "./locale-provider";

// One dot per credit of a new member's starting balance (free credits + the upgrade bonus).
const METER_DOTS = FREE_CREDITS + UPGRADE_BONUS;
const DOT_PITCH = 9;
// Long enough to cross the gap from the avatar into the card without it closing.
const CLOSE_DELAY_MS = 150;

const MENU_ROW =
  "flex h-10 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm text-text-1 transition-colors duration-150 hover:bg-bg-2 [&>svg]:size-4.5 [&>svg]:text-text-2";

export function AuthButtons() {
  const { account, openAuthModal } = useApp();
  const t = useT();

  // Holds the space while the session is read, so a signed-in visitor never sees Sign in flash first.
  if (account === null) return <span aria-hidden className="size-8" />;
  if (account.status === "member") return <AccountMenu email={account.email} handle={account.handle} />;

  return (
    <>
      <button
        type="button"
        onClick={() => openAuthModal("login")}
        className="flex h-8 items-center rounded-md px-3 text-sm font-medium text-text-2 transition-colors duration-150 hover:bg-bg-2 hover:text-text-1 max-sm:hidden"
      >
        {t("auth.login")}
      </button>
      <button
        type="button"
        onClick={() => openAuthModal("signup")}
        className="flex h-8 items-center rounded-md bg-text-1 px-3 text-sm font-semibold text-bg-0 transition-colors duration-150 hover:bg-white"
      >
        {t("auth.signup")}
      </button>
    </>
  );
}

function AccountMenu({ email, handle }: { email: string; handle: string | null }) {
  const { credits } = useApp();
  const { locale, t, setLocale } = useLocale();
  const creditsHelp = t("account.creditsHelp", {
    a: MODELS["flux-schnell"].label,
    aCost: MODELS["flux-schnell"].credits,
    b: MODELS["flux-dev"].label,
    bCost: MODELS["flux-dev"].credits,
  });
  const [open, setOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const languagesId = useId();
  // Reopening starts collapsed, so the card keeps its usual height.
  if (!open && languagesOpen) setLanguagesOpen(false);
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const name = handle ?? email;

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  function clearCloseTimer() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  // Hover opens it for a mouse only; touch and keyboard use the click toggle, where hover doesn't exist.
  function onEnter(e: ReactPointerEvent) {
    if (e.pointerType !== "mouse") return;
    clearCloseTimer();
    setOpen(true);
  }

  function onLeave(e: ReactPointerEvent) {
    if (e.pointerType !== "mouse") return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  async function leave() {
    setLeaving(true);
    try {
      await logOut();
    } finally {
      // Everything on screen (gallery, history, balance) belonged to the account that just left.
      window.location.reload();
    }
  }

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative" onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("account.named", { name })}
        className="flex size-8 items-center justify-center rounded-full bg-bg-2 text-xs font-semibold text-text-1 uppercase ring-1 ring-line-2 transition-colors duration-150 hover:bg-bg-3"
      >
        <span aria-hidden>{name.charAt(0)}</span>
      </button>

      {open && (
        // pt-2 is a hover bridge: the card sits 8px below the avatar, and the pointer crosses this padding.
        <div className="absolute top-full right-0 z-50 pt-2">
          <div
            role="menu"
            aria-label={t("account.label")}
            className="w-72 rounded-xl border border-line-2 bg-bg-1 p-1.5 shadow-float motion-safe:animate-pop-in motion-reduce:animate-fade-in"
          >
            <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-2 text-sm font-semibold uppercase ring-1 ring-line-2"
              >
                {name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{name}</p>
                <p className="truncate text-sm text-text-2">{t("account.freePlan")}</p>
              </div>
            </div>

            <Link href="/pricing" role="menuitem" onClick={close} className="group block rounded-lg bg-bg-2 p-3 transition-colors duration-150 hover:bg-bg-3">
              <span className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  {t("account.credits")}
                  <span title={creditsHelp} aria-label={creditsHelp} className="text-text-3">
                    <HelpIcon className="size-4" />
                  </span>
                </span>
                <span className="flex items-center gap-0.5 text-text-2 tabular-nums transition-colors duration-150 group-hover:text-text-1">
                  {t("account.left", { n: credits ?? "–" })}
                  <ChevronRightIcon className="size-4" />
                </span>
              </span>
              <DotMeter value={credits ?? 0} />
            </Link>

            <div className="mt-1.5 flex flex-col">
              <MenuLink href="/assets" icon={<BoxIcon />} onClick={close}>
                {t("nav.gallery")}
              </MenuLink>
              <MenuLink href="/community" icon={<UsersIcon />} onClick={close}>
                {t("nav.community")}
              </MenuLink>
              {/* Expands in place rather than as a flyout: a flyout would leave the card and trip the hover close. */}
              <button
                type="button"
                role="menuitem"
                aria-expanded={languagesOpen}
                aria-controls={languagesId}
                onClick={() => setLanguagesOpen((v) => !v)}
                className={MENU_ROW}
              >
                <GlobeIcon />
                <span className="flex-1">{t("locale.label")}</span>
                <span className="text-text-2">{LOCALE_NAMES[locale]}</span>
                <ChevronRightIcon
                  className={`size-4! transition-transform duration-150 ${languagesOpen ? "rotate-90" : ""}`}
                />
              </button>
              {languagesOpen && (
                <div
                  id={languagesId}
                  role="group"
                  aria-label={t("locale.label")}
                  className="flex flex-col pl-7.5 motion-safe:animate-fade-in"
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
                        onClick={() => setLocale(code)}
                        className={`flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm transition-colors duration-150 hover:bg-bg-2 ${
                          checked ? "text-text-1" : "text-text-2 hover:text-text-1"
                        }`}
                      >
                        <span className="flex-1">{LOCALE_NAMES[code]}</span>
                        <CheckIcon className={`size-4 shrink-0 ${checked ? "" : "invisible"}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="my-1.5 h-px bg-line-1" />
            <button
              type="button"
              role="menuitem"
              onClick={() => void leave()}
              disabled={leaving}
              className={`${MENU_ROW} font-medium disabled:text-text-disabled`}
            >
              {leaving ? <SpinnerIcon className="motion-safe:animate-spin" /> : <LogOutIcon />}
              {leaving ? t("account.signingOut") : t("account.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className={MENU_ROW}>
      {icon}
      {children}
    </Link>
  );
}

// Filled dots share one gradient across the whole row, so a full meter reads as the logo's colours left to right.
function DotMeter({ value }: { value: number }) {
  const id = useId();
  const width = METER_DOTS * DOT_PITCH;
  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${DOT_PITCH}`} className="mt-3 block h-auto w-full">
      <defs>
        <BrandGradient id={id} x1={0} x2={width} y={DOT_PITCH / 2} />
      </defs>
      {Array.from({ length: METER_DOTS }, (_, i) => (
        <circle
          key={i}
          cx={i * DOT_PITCH + DOT_PITCH / 2}
          cy={DOT_PITCH / 2}
          r={2.75}
          fill={i < value ? `url(#${id})` : undefined}
          className={i < value ? undefined : "fill-bg-3"}
        />
      ))}
    </svg>
  );
}
