"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

export type NavLink = {
  label: string;
  /** Real route. Items without one aren't built: they render as plain text with a Soon badge, not a link. */
  route?: string;
  /** Draws the thin divider before this link, splitting core tools from the wider product line. */
  groupStart?: boolean;
};

// A link that bounced back to Explore read as broken; a Soon badge reads as scope.
export const LINKS: NavLink[] = [
  { label: "Explore", route: "/" },
  { label: "Image", route: "/image" },
  { label: "Video" },
  { label: "Assets", route: "/assets" },
  { label: "Community", route: "/community" },
  { label: "Audio" },
  { label: "MCP" },
  { label: "API" },
  { label: "ChatGPT Plugin", groupStart: true },
  { label: "Genjutsu" },
  { label: "Effects" },
  { label: "Cinema Studio" },
  { label: "Contests" },
  { label: "Marketing Studio" },
  { label: "Supercomputer" },
];

export const SOON_BADGE = (
  <span className="flex h-4 items-center rounded-xs bg-accent-badge-bg px-1 text-[10px] leading-3 font-semibold text-accent-text">
    Soon
  </span>
);

export function isActive(route: string | undefined, pathname: string): boolean {
  if (!route) return false;
  return route === "/" ? pathname === "/" : pathname.startsWith(route);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    // Scrolls sideways when the window is too narrow for every link; the right edge fades instead of clipping.
    <div className="min-w-0 flex-1 overflow-x-auto mask-r-from-85% [scrollbar-width:none] max-md:hidden">
      <ul className="flex w-max items-center gap-5 pr-10">
        {LINKS.map((link) => {
          const { route } = link;
          const active = isActive(route, pathname);

          return (
            <Fragment key={link.label}>
              {link.groupStart && <li aria-hidden className="h-4 w-px bg-border-3" />}
              <li>
                {route ? (
                  <Link
                    href={route}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center rounded-sm text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                      active ? "text-accent-text" : "text-text-2 hover:text-text-1"
                    }`}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <span
                    aria-disabled
                    className="flex cursor-not-allowed items-center gap-1.5 text-sm font-medium whitespace-nowrap text-text-disabled"
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
  );
}
