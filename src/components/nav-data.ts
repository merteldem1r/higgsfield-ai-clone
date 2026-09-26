import type { MessageKey } from "@/lib/i18n";

// Plain data, no "use client": the footer (a server component) and the client nav both read it.
// Six real routes. Nothing is listed that doesn't exist.
export const LINKS: { labelKey: MessageKey; route: string }[] = [
  { labelKey: "nav.studio", route: "/image" },
  { labelKey: "nav.gallery", route: "/assets" },
  { labelKey: "nav.community", route: "/community" },
  { labelKey: "nav.pricing", route: "/pricing" },
  { labelKey: "nav.faq", route: "/faq" },
  { labelKey: "nav.contact", route: "/contact" },
];

export function isActive(route: string, pathname: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}
