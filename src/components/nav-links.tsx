"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "./locale-provider";
import { isActive, LINKS } from "./nav-data";

export function NavLinks() {
  const pathname = usePathname();
  const t = useT();

  return (
    <ul className="flex items-center gap-6 max-xl:hidden">
      {LINKS.map(({ labelKey, route }) => {
        const active = isActive(route, pathname);
        return (
          <li key={route}>
            <Link
              href={route}
              aria-current={active ? "page" : undefined}
              className={`flex h-8 items-center rounded-sm text-sm font-medium transition-colors duration-150 ${
                active ? "text-text-1" : "text-text-2 hover:text-text-1"
              }`}
            >
              {t(labelKey)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
