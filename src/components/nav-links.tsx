"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Explore" },
  { href: "/image", label: "Image" },
  { href: "/video", label: "Video", badge: "Soon" },
  { href: "/assets", label: "Assets" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-5 max-md:hidden">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-150 ${
                active ? "text-accent-text" : "text-text-2 hover:text-text-1"
              }`}
            >
              {link.label}
              {"badge" in link && (
                <span className="flex h-4 items-center rounded-xs bg-accent-badge-bg px-1 text-[10px] leading-3 font-semibold text-accent-text">
                  {link.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
