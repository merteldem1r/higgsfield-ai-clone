"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ChevronUpIcon } from "@/components/icons";
import { useT } from "@/components/locale-provider";
import type { MessageKey } from "@/lib/i18n";

const ADVANCE_MS = 6000;

const SLIDES: { title: MessageKey; tagline: MessageKey; alt: MessageKey; src: string; href: string }[] = [
  {
    title: "home.slide.dev.title",
    tagline: "home.slide.dev.text",
    src: "/showcase/g12.jpg",
    alt: "alt.carousel.station",
    href: "/image?model=flux-dev",
  },
  {
    title: "home.slide.free.title",
    tagline: "home.slide.free.text",
    src: "/showcase/g08.jpg",
    alt: "alt.carousel.canyon",
    href: "/image",
  },
  {
    title: "home.slide.batch.title",
    tagline: "home.slide.batch.text",
    src: "/showcase/g04.jpg",
    alt: "alt.carousel.alley",
    href: "/image",
  },
  {
    title: "home.slide.aspect.title",
    tagline: "home.slide.aspect.text",
    src: "/showcase/g01.jpg",
    alt: "alt.carousel.river",
    href: "/image",
  },
];

const ARROW =
  "absolute top-[calc(50%-28px)] z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-bg-0/70 text-text-1 shadow-float backdrop-blur-md transition-colors duration-150 hover:bg-bg-3 pointer-coarse:hidden";

// One card per step; wraps around at either end.
function step(track: HTMLElement | null, direction: 1 | -1) {
  const card = track?.firstElementChild as HTMLElement | null;
  if (!track || !card) return;
  const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  const atStart = track.scrollLeft <= 4;
  if (direction === 1 && atEnd) track.scrollTo({ left: 0 });
  else if (direction === -1 && atStart) track.scrollTo({ left: track.scrollWidth });
  else track.scrollBy({ left: direction * (card.offsetWidth + 12) });
}

export function PromoCarousel() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);
  const t = useT();

  // Auto-advance pauses on hover/focus and in background tabs, and is off under reduced motion.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (!document.hidden) step(trackRef.current, 1);
    }, ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("home.whatsNew")}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <ul
        ref={trackRef}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 [scrollbar-width:none] motion-reduce:scroll-auto sm:-mx-6 sm:scroll-px-6 sm:px-6"
      >
        {SLIDES.map((slide, i) => (
          <li
            key={t(slide.title)}
            aria-roledescription="slide"
            aria-label={t("home.slideOf", { i: i + 1, n: SLIDES.length })}
            className="w-[85%] shrink-0 snap-start sm:w-[60%] lg:w-[calc((100%-36px)/3.25)]"
          >
            <Link href={slide.href} className="group block rounded-xl">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-bg-2">
                <Image
                  src={slide.src}
                  alt={t(slide.alt)}
                  fill
                  sizes="(min-width: 1024px) 31vw, (min-width: 640px) 60vw, 85vw"
                  preload={i < 2}
                  className={`object-cover transition-[filter] duration-150 group-hover:brightness-110 ${
                    i % 2 === 0 ? "motion-safe:animate-ken-burns" : "motion-safe:animate-ken-burns-reverse"
                  }`}
                />
                <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/8 ring-inset transition-shadow duration-150 group-hover:ring-accent/50" />
              </div>
              <h3 className="mt-3 font-display text-h3 uppercase transition-colors duration-150 group-hover:text-accent-text">
                {t(slide.title)}
              </h3>
              <p className="mt-0.5 text-sm text-text-2">{t(slide.tagline)}</p>
            </Link>
          </li>
        ))}
      </ul>

      <button type="button" aria-label={t("home.prev")} onClick={() => step(trackRef.current, -1)} className={`${ARROW} left-2`}>
        <ChevronUpIcon className="size-4 -rotate-90" />
      </button>
      <button type="button" aria-label={t("home.next")} onClick={() => step(trackRef.current, 1)} className={`${ARROW} right-2`}>
        <ChevronUpIcon className="size-4 rotate-90" />
      </button>
    </section>
  );
}
