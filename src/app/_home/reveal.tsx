"use client";

import { useEffect, useRef, type ReactNode, type Ref } from "react";

const MAX_STAGGER_STEPS = 10; // caps the last child's delay at 600ms however long the list is

// Fades its direct children in once, the first time the container scrolls into view (CSS in globals.css).
export function Reveal({
  as: Tag = "div",
  className,
  children,
}: {
  as?: "div" | "ul";
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    [...el.children].forEach((child, i) => {
      (child as HTMLElement).style.setProperty("--reveal-i", String(Math.min(i, MAX_STAGGER_STEPS)));
    });
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.revealed = "";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref as Ref<HTMLDivElement & HTMLUListElement>} data-reveal="" className={className}>
      {children}
    </Tag>
  );
}
