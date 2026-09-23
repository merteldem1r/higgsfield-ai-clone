"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

type NavLink = {
  label: string;
  /** Real route. Links without one are display-only for now and send visitors to Explore. */
  route?: string;
  badge?: string;
  tone?: "gold";
  /** Draws the thin divider before this link, splitting core tools from the wider product line. */
  groupStart?: boolean;
};

const LINKS: NavLink[] = [
  { label: "Explore", route: "/" },
  { label: "Image", route: "/image" },
  { label: "Video", route: "/video", badge: "Soon" },
  { label: "Assets", route: "/assets" },
  { label: "Audio" },
  { label: "MCP" },
  { label: "API", badge: "New" },
  { label: "ChatGPT Plugin", badge: "New", groupStart: true },
  { label: "Genjutsu", badge: "New" },
  { label: "Effects", badge: "Free" },
  { label: "Cinema Studio" },
  { label: "Contests", tone: "gold" },
  { label: "Marketing Studio" },
  { label: "Supercomputer" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    // Scrolls sideways when the window is too narrow for every link; the right edge fades instead of clipping.
    <div className="min-w-0 flex-1 overflow-x-auto mask-r-from-85% [scrollbar-width:none] max-md:hidden">
      <ul className="flex w-max items-center gap-5 pr-10">
        {LINKS.map((link) => {
          const active = link.route
            ? link.route === "/"
              ? pathname === "/"
              : pathname.startsWith(link.route)
            : false;
          const color = active
            ? "text-accent-text"
            : link.tone === "gold"
              ? "text-gold hover:brightness-125"
              : "text-text-2 hover:text-text-1";

          return (
            <Fragment key={link.label}>
              {link.groupStart && <li aria-hidden className="h-4 w-px bg-border-3" />}
              <li>
                <Link
                  href={link.route ?? "/"}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-sm text-sm font-medium whitespace-nowrap transition-[color,filter] duration-150 ${color}`}
                >
                  {link.label}
                  {link.badge && (
                    <span className="flex h-4 items-center rounded-xs bg-accent-badge-bg px-1 text-[10px] leading-3 font-semibold text-accent-text">
                      {link.badge}
                    </span>
                  )}
                </Link>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}
