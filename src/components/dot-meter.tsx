"use client";

import { useId } from "react";

import { FREE_CREDITS, UPGRADE_BONUS } from "@/lib/credits";

import { BrandGradient } from "./icons";

// One dot per credit of a new member's starting balance (free credits + the upgrade bonus).
export const METER_DOTS = FREE_CREDITS + UPGRADE_BONUS;
const PITCH = 9;
const R = 2.75;

// Filled dots share one gradient across the whole row, so a full meter reads as the logo's colours left to right.
// The fill is one gradient rect clipped to the dot shapes; its width animates, so a spend ticks the dots off
// instead of swapping them. Static under reduced motion (the transition is opacity-free, so it just jumps).
export function DotMeter({ value, className = "" }: { value: number; className?: string }) {
  const id = useId();
  const width = METER_DOTS * PITCH;
  const filled = Math.max(0, Math.min(METER_DOTS, value));
  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${PITCH}`} className={`block h-auto ${className}`}>
      <defs>
        <BrandGradient id={`${id}-g`} x1={0} x2={width} y={PITCH / 2} />
        <clipPath id={`${id}-c`}>
          {Array.from({ length: METER_DOTS }, (_, i) => (
            <circle key={i} cx={i * PITCH + PITCH / 2} cy={PITCH / 2} r={R} />
          ))}
        </clipPath>
      </defs>
      {Array.from({ length: METER_DOTS }, (_, i) => (
        <circle key={i} cx={i * PITCH + PITCH / 2} cy={PITCH / 2} r={R} className="fill-bg-3" />
      ))}
      <rect
        x={0}
        y={0}
        height={PITCH}
        width={filled * PITCH}
        fill={`url(#${id}-g)`}
        clipPath={`url(#${id}-c)`}
        className="transition-[width] duration-300 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}
