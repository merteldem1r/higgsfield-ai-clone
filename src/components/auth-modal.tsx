"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { useApp, type AuthModalVariant } from "./app-provider";
import { GiftIcon, GoogleIcon, LogoMark, MailIcon, SparkleIcon, XIcon } from "./icons";

// UI only until P1/P2 (docs/PLAN.md): every provider explains it's coming instead of pretending to work.
// Apple and Microsoft are left out on purpose; PLAN skips them, so showing them would promise something that never ships.

const COPY: Record<AuthModalVariant, { title: string; subtitle: string }> = {
  login: { title: "Welcome back", subtitle: "Log in to pick up where you left off." },
  signup: { title: "Create your account", subtitle: "Sign up and get 50 credits. Your images come with you." },
  "out-of-credits": {
    title: "You're out of free credits",
    subtitle: "Sign up to get 50 more — your images stay in your gallery",
  },
};

const SLIDES = [
  {
    label: "Flux Dev",
    title: "Richer light",
    text: "Finer detail and truer shadows, 6 credits an image.",
    src: "/showcase/g07.jpg",
  },
  {
    label: "Flux Schnell",
    title: "Drafts in seconds",
    text: "Two credits and about two seconds per image.",
    src: "/presets/neon-noir.jpg",
  },
  {
    label: "Presets",
    title: "Start from a style",
    text: "Eight looks, one click, your own subject.",
    src: "/presets/pastel-dream.jpg",
  },
  {
    label: "Batch",
    title: "Four takes at once",
    text: "One prompt, four images. Keep the best.",
    src: "/showcase/g03.jpg",
  },
];

export function AuthModal() {
  const { authModal, closeAuthModal } = useApp();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = authModal !== null;
  const mode = authModal ?? "signup";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={closeAuthModal}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      aria-labelledby="auth-modal-title"
      className="m-0 h-dvh max-h-none w-full max-w-none bg-bg-1 p-0 text-text-1 shadow-modal backdrop:bg-overlay open:motion-safe:animate-modal-in open:motion-reduce:animate-fade-in sm:m-auto sm:h-[min(776px,calc(100dvh-48px))] sm:w-[calc(100%-48px)] sm:max-w-280 sm:rounded-2xl sm:p-3"
    >
      <div className="flex h-full">
        {/* Keyed on open so the carousel restarts at slide one each time the modal opens. */}
        <AuthCarousel key={String(open)} />
        <AuthPanel key={`${mode}:${open}`} mode={mode} />
      </div>
    </dialog>
  );
}

function AuthCarousel() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  return (
    <div className="relative hidden w-1/2 shrink-0 overflow-hidden rounded-xl bg-bg-2 md:block">
      {SLIDES.map((s, i) => (
        <Image
          key={s.src}
          src={s.src}
          alt=""
          fill
          sizes="560px"
          className={`object-cover transition-opacity duration-400 ${i === index ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/50 to-transparent px-6 pt-32 pb-6">
        <div key={index} className="motion-safe:animate-rise-in motion-reduce:animate-fade-in">
          <span className="inline-flex h-6 items-center gap-1.5 rounded-sm bg-bg-5/80 px-2 text-[11px] font-semibold backdrop-blur-sm">
            <SparkleIcon gradient className="size-3" />
            {slide.label}
          </span>
          <p className="mt-3 font-display text-[40px] leading-10 text-white uppercase">{slide.title}</p>
          <p className="mt-2 text-sm text-white/70">{slide.text}</p>
        </div>

        <div className="mt-6 flex gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.label}`}
              aria-current={i === index}
              className="group flex flex-1 flex-col gap-2 text-left"
            >
              <span className="h-0.75 w-full overflow-hidden rounded-full bg-progress-track">
                {/* The active bar's fill animation drives auto-advance; under reduced motion it's just full. */}
                <span
                  key={i === index ? `active-${index}` : "idle"}
                  onAnimationEnd={() => setIndex((index + 1) % SLIDES.length)}
                  className={`block h-full origin-left bg-white ${
                    i < index
                      ? "scale-x-100"
                      : i === index
                        ? "motion-safe:animate-progress-fill motion-reduce:scale-x-100"
                        : "scale-x-0"
                  }`}
                />
              </span>
              <span
                className={`text-xs font-medium transition-colors duration-150 ${
                  i === index ? "text-white" : "text-text-2 group-hover:text-text-1"
                }`}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const PROVIDER =
  "flex h-14 w-full items-center justify-center gap-2.5 rounded-lg border border-border-3 bg-bg-1 text-sm font-semibold transition-colors duration-150 hover:border-bg-5 hover:bg-bg-3";

function AuthPanel({ mode }: { mode: AuthModalVariant }) {
  const { closeAuthModal, openAuthModal } = useApp();
  const [agreed, setAgreed] = useState(false);
  const [note, setNote] = useState<{ tone: "neutral" | "danger"; text: string } | null>(null);
  const isLogin = mode === "login";
  const copy = COPY[mode];

  function choose(provider: string) {
    if (!isLogin && !agreed) {
      setNote({ tone: "danger", text: "Tick the box to accept the terms first." });
      return;
    }
    setNote({ tone: "neutral", text: `${provider} sign-in is coming soon. You can keep generating as a guest.` });
  }

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-y-auto px-6 py-14">
      <button
        type="button"
        onClick={closeAuthModal}
        aria-label="Close"
        className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-bg-3 text-text-2 transition-colors duration-150 hover:bg-bg-5 hover:text-text-1"
      >
        <XIcon className="size-4" />
      </button>

      <div className="my-auto flex w-full max-w-96 flex-col">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="size-10" />
          <h2 id="auth-modal-title" className="mt-5 text-title font-semibold">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm text-text-2">{copy.subtitle}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {isLogin ? (
            <>
              <button type="button" onClick={() => choose("Google")} className={PROVIDER}>
                <GoogleIcon className="size-4.5" />
                Continue with Google
              </button>
              <div className="flex items-center gap-3 py-1 text-xs text-text-3">
                <span className="h-px flex-1 bg-border-1" />
                OR
                <span className="h-px flex-1 bg-border-1" />
              </div>
              <button type="button" onClick={() => choose("Email")} className={PROVIDER}>
                <MailIcon className="size-4.5" />
                Continue with Email
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => choose("Email")}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-accent-tint-2 text-sm font-semibold text-accent-text transition-colors duration-150 hover:bg-accent-badge-bg"
              >
                <GiftIcon className="size-4.5" />
                Continue with email &amp; get 50 credits
              </button>
              <button type="button" onClick={() => choose("Google")} className={PROVIDER}>
                <GoogleIcon className="size-4.5" />
                Continue with Google
              </button>
              <label className="mt-2 flex cursor-pointer items-start gap-3 text-xs leading-4.5 text-text-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked && note?.tone === "danger") setNote(null);
                  }}
                  aria-invalid={note?.tone === "danger"}
                  className="mt-px size-4 shrink-0 cursor-pointer rounded-sm accent-accent aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-danger"
                />
                I agree to the Terms of Use, acknowledge the Privacy Policy, and confirm I&apos;m at least 18 years old.
              </label>
            </>
          )}
        </div>

        <p role="status" className={`mt-4 min-h-4.5 text-center text-xs ${note?.tone === "danger" ? "text-danger" : "text-text-2"}`}>
          {note?.text}
        </p>

        <p className="mt-6 border-t border-border-1 pt-5 text-center text-[13px] text-text-2">
          {isLogin ? "New here? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => openAuthModal(isLogin ? "signup" : "login")}
            className="font-semibold text-accent-text transition-colors duration-150 hover:text-accent-hover"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
