"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import { FOCUS_COMPOSER_EVENT, FOCUS_PARAM } from "./composer/handoff";
import { BoxIcon, DiamondIcon, HomeIcon, SparkleIcon, UsersIcon } from "./icons";

type Tab = { label: string; route: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

const LEFT: Tab[] = [
  { label: "Home", route: "/", icon: HomeIcon },
  { label: "Community", route: "/community", icon: UsersIcon },
];
const RIGHT: Tab[] = [
  { label: "Assets", route: "/assets", icon: BoxIcon },
  { label: "Pricing", route: "/pricing", icon: DiamondIcon },
];

export function MobileTabBar() {
  const pathname = usePathname();

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
          <Icon className="size-5.5" />
          {label}
        </Link>
      </li>
    );
  }

  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-1 bg-tabbar pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-start px-2">
        {LEFT.map(renderTab)}
        <li className="flex flex-1 justify-center">
          <Link
            href={`/image?${FOCUS_PARAM}=1`}
            aria-label="Create an image"
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
