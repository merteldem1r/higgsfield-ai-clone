"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import type { MessageKey } from "@/lib/i18n";

import { FOCUS_COMPOSER_EVENT, FOCUS_PARAM } from "./composer/handoff";
import { useT } from "./locale-provider";
import { BoxIcon, DiamondIcon, HomeIcon, SparkleIcon, UsersIcon } from "./icons";

type Tab = { label: MessageKey; route: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

const LEFT: Tab[] = [
  { label: "nav.home", route: "/", icon: HomeIcon },
  { label: "nav.community", route: "/community", icon: UsersIcon },
];
const RIGHT: Tab[] = [
  { label: "nav.assets", route: "/assets", icon: BoxIcon },
  { label: "nav.pricing", route: "/pricing", icon: DiamondIcon },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const t = useT();

  function renderTab({ label, route, icon: Icon }: Tab) {
    const active = route === "/" ? pathname === "/" : pathname.startsWith(route);
    return (
      <li key={route} className="flex-1">
        <Link
          href={route}
          aria-current={active ? "page" : undefined}
          className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] leading-3.5 font-medium transition-colors duration-150 ${
            active ? "text-text-1" : "text-text-2"
          }`}
        >
          <Icon className="size-5.5 shrink-0" />
          <span className="max-w-full truncate px-0.5">{t(label)}</span>
        </Link>
      </li>
    );
  }

  return (
    <nav
      aria-label={t("nav.tabs")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-1 bg-tabbar pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-start px-2">
        {LEFT.map(renderTab)}
        <li className="flex flex-1 justify-center">
          <Link
            href={`/image?${FOCUS_PARAM}=1`}
            aria-label={t("nav.createImage")}
            onClick={(e) => {
              if (pathname !== "/image") return;
              e.preventDefault();
              window.dispatchEvent(new Event(FOCUS_COMPOSER_EVENT));
            }}
            className="-mt-1.5 flex h-11 w-16 items-center justify-center rounded-lg bg-brand-gradient text-accent-ink inset-shadow-lip shadow-brand-glow-soft transition-[filter,translate] duration-150 active:translate-y-px active:inset-shadow-lip-pressed"
          >
            <SparkleIcon className="size-5" />
          </Link>
        </li>
        {RIGHT.map(renderTab)}
      </ul>
    </nav>
  );
}
