"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { CheckIcon, ChevronUpIcon } from "@/components/icons";

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  /** Shown after the label in the menu and inside the closed chip (e.g. a credit cost). */
  meta?: ReactNode;
  icon?: ReactNode;
};

export const CHIP_CLASS =
  "flex h-9 shrink-0 items-center gap-2 rounded-md bg-bg-2 px-3 text-sm font-medium text-text-1 transition-colors duration-150 hover:bg-bg-3 disabled:pointer-events-none disabled:opacity-50";

type Props<T extends string> = {
  label: string;
  icon: ReactNode;
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled: boolean;
};

export function ChipMenu<T extends string>({ label, icon, options, value, onChange, disabled }: Props<T>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  // Going in flight closes the menu for good: the settings now belong to the pending frame.
  if (disabled && open) setOpen(false);
  const shown = open && !disabled;
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!shown) return;
    listRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [shown]);

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      chipRef.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        ref={chipRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={shown}
        aria-controls={menuId}
        aria-label={`${label}: ${selected?.label ?? value}`}
        onClick={() => setOpen((o) => !o)}
        className={`${CHIP_CLASS} ${shown ? "bg-bg-3" : ""}`}
      >
        <span className="size-4 text-text-2 [&>svg]:size-4">{icon}</span>
        {selected?.label ?? value}
        {selected?.meta}
        <ChevronUpIcon className={`size-3.5 text-text-2 transition-transform duration-150 ${shown ? "rotate-180" : ""}`} />
      </button>

      {shown && (
        <div
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute top-full left-0 z-10 mt-2 w-72 rounded-lg border border-line-2 bg-bg-1 p-1.5 shadow-float motion-safe:animate-pop-in motion-reduce:animate-fade-in"
        >
          {options.map((option) => {
            const checked = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  chipRef.current?.focus();
                }}
                className="flex min-h-10 w-full items-center gap-3 rounded-md px-2.5 py-1.5 text-left transition-colors duration-150 outline-none hover:bg-bg-2 focus-visible:bg-bg-2"
              >
                {option.icon && <span className="text-text-2">{option.icon}</span>}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium text-text-1">{option.label}</span>
                  {option.description && <span className="text-xs text-text-2">{option.description}</span>}
                </span>
                {option.meta}
                <CheckIcon className={`size-4 shrink-0 ${checked ? "" : "invisible"}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
