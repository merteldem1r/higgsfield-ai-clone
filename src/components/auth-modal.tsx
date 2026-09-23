"use client";

import { useEffect, useRef } from "react";

import { useApp } from "./app-provider";
import { LogoMark, XIcon } from "./icons";

// Step-3 stub. Step 4 replaces the body with the split carousel modal from DESIGN.md.
const COPY = {
  signup: {
    title: "Welcome to the studio",
    subtitle: "Sign up to get 50 credits — your images stay in your gallery",
  },
  "out-of-credits": {
    title: "You're out of free credits",
    subtitle: "Sign up to get 50 more — your images stay in your gallery",
  },
} as const;

export function AuthModal() {
  const { authModal, closeAuthModal } = useApp();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (authModal && !dialog.open) dialog.showModal();
    if (!authModal && dialog.open) dialog.close();
  }, [authModal]);

  const copy = COPY[authModal ?? "signup"];

  return (
    <dialog
      ref={dialogRef}
      onClose={closeAuthModal}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      aria-labelledby="auth-modal-title"
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-2xl bg-bg-1 p-0 text-text-1 shadow-modal backdrop:bg-overlay open:motion-safe:animate-modal-in open:motion-reduce:animate-fade-in"
    >
      <div className="relative flex flex-col items-center px-8 pt-12 pb-8 text-center">
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close"
          className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-bg-3 text-text-2 transition-colors duration-150 hover:bg-bg-5 hover:text-text-1"
        >
          <XIcon className="size-4" />
        </button>
        <LogoMark className="size-8" />
        <h2 id="auth-modal-title" className="mt-5 text-title font-semibold">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-text-2">{copy.subtitle}</p>
        <button
          type="button"
          disabled
          className="mt-8 flex h-14 w-full items-center justify-center rounded-lg border border-border-3 bg-bg-1 text-sm font-semibold text-text-disabled"
        >
          Sign up — coming soon
        </button>
      </div>
    </dialog>
  );
}
