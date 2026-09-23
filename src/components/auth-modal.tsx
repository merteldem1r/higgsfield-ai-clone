"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { UPGRADE_BONUS } from "@/lib/credits";
import { logInWithEmail, signUpWithEmail } from "@/lib/supabase/session";

import { useApp, type AuthModalVariant } from "./app-provider";
import { AlertIcon, GiftIcon, GoogleIcon, LogoMark, SparkleIcon, SpinnerIcon, XIcon } from "./icons";

// Email + password is real. Google stays visible but disabled until it ships (docs/PLAN.md P2).
// Apple and Microsoft are left out on purpose; PLAN skips them, so showing them would promise something that never ships.

const COPY: Record<AuthModalVariant, { title: string; subtitle: string }> = {
  login: { title: "Welcome back", subtitle: "Log in to see your images on any device." },
  signup: {
    title: "Create your account",
    subtitle: `Add an email and password and get ${UPGRADE_BONUS} credits. Everything you've made comes with you.`,
  },
  "out-of-credits": {
    title: "You're out of free credits",
    subtitle: `Sign up to get ${UPGRADE_BONUS} more. Your images stay in your gallery.`,
  },
};

// Supabase's default minimum; checking it here saves a round trip for the common mistake.
const MIN_PASSWORD = 6;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

type Tab = "signup" | "login";
type FormError = { kind: "exists" } | { kind: "message"; text: string };

const INPUT =
  "h-12 w-full rounded-lg border border-border-3 bg-bg-2 px-3.5 text-[15px] text-text-1 outline-none transition-colors duration-150 placeholder:text-text-placeholder focus-visible:border-accent/60 aria-invalid:border-danger/70";

function AuthPanel({ mode }: { mode: AuthModalVariant }) {
  const { account, closeAuthModal, setCredits, refreshAccount } = useApp();
  const [tab, setTab] = useState<Tab>(mode === "login" ? "login" : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  // Field errors appear once the visitor has tried to submit, then track their typing live.
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [providerNote, setProviderNote] = useState(false);
  // Set after a successful sign-up: the panel swaps the form for the welcome view.
  const [welcome, setWelcome] = useState<{ granted: boolean; credits: number | null } | null>(null);
  const ids = useId();
  const isLogin = tab === "login";
  // The out-of-credits wording only fits the signup tab it opened on.
  const copy = COPY[isLogin ? "login" : mode === "login" ? "signup" : mode];

  const emailError = !email.trim()
    ? "Enter your email."
    : !EMAIL_SHAPE.test(email.trim())
      ? "That doesn't look like an email address."
      : null;
  const passwordError = !password
    ? "Enter a password."
    : !isLogin && password.length < MIN_PASSWORD
      ? `Use at least ${MIN_PASSWORD} characters.`
      : null;
  const termsError = !isLogin && !agreed ? "Tick the box to accept the terms." : null;

  function switchTab(next: Tab) {
    setTab(next);
    setAttempted(false);
    setFormError(null);
    setProviderNote(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setAttempted(true);
    setFormError(null);
    if (emailError || passwordError || termsError) return;

    setPending(true);
    try {
      const outcome = isLogin
        ? await logInWithEmail(email.trim(), password)
        : await signUpWithEmail(email.trim(), password);

      if (!outcome.ok) {
        const exists = outcome.code === "email_exists" || outcome.code === "user_already_exists";
        setFormError(exists && !isLogin ? { kind: "exists" } : { kind: "message", text: outcome.message });
        return;
      }

      if (isLogin) {
        // A different user now: the gallery, history and balance on screen belong to the old session.
        window.location.reload();
        return;
      }

      if (outcome.credits !== null) setCredits(outcome.credits);
      else void refreshAccount();
      setWelcome({ granted: outcome.granted, credits: outcome.credits });
    } catch (err) {
      console.error("Auth request failed", err);
      setFormError({ kind: "message", text: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  const tabClass = (active: boolean) =>
    `flex h-9 flex-1 items-center justify-center rounded-md text-sm font-semibold transition-colors duration-150 ${
      active ? "bg-bg-3 text-text-1" : "text-text-2 hover:text-text-1"
    }`;

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

      {welcome ? (
        <Welcome email={email.trim()} granted={welcome.granted} credits={welcome.credits} />
      ) : (
        <div className="my-auto flex w-full max-w-96 flex-col">
          <div className="flex flex-col items-center text-center">
            <LogoMark className="size-10" />
            <h2 id="auth-modal-title" className="mt-5 text-title font-semibold">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm text-text-2">{copy.subtitle}</p>
          </div>

          <div role="tablist" aria-label="Account" className="mt-7 flex gap-1 rounded-lg border border-border-3 bg-bg-1 p-1">
            <button type="button" role="tab" aria-selected={!isLogin} onClick={() => switchTab("signup")} className={tabClass(!isLogin)}>
              Sign up
            </button>
            <button type="button" role="tab" aria-selected={isLogin} onClick={() => switchTab("login")} className={tabClass(isLogin)}>
              Log in
            </button>
          </div>

          <form noValidate onSubmit={submit} className="mt-5 flex flex-col gap-3" aria-busy={pending}>
            <Field id={`${ids}-email`} label="Email" error={attempted ? emailError : null}>
              <input
                id={`${ids}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
                aria-invalid={attempted && emailError !== null}
                aria-describedby={attempted && emailError ? `${ids}-email-error` : undefined}
                className={INPUT}
              />
            </Field>
            <Field
              id={`${ids}-password`}
              label="Password"
              error={attempted ? passwordError : null}
              hint={isLogin ? undefined : `At least ${MIN_PASSWORD} characters.`}
            >
              <input
                id={`${ids}-password`}
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                aria-invalid={attempted && passwordError !== null}
                aria-describedby={`${ids}-password-error`}
                className={INPUT}
              />
            </Field>

            {!isLogin && (
              <label className="mt-1 flex cursor-pointer items-start gap-3 text-xs leading-4.5 text-text-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  disabled={pending}
                  aria-invalid={attempted && termsError !== null}
                  className="mt-px size-4 shrink-0 cursor-pointer rounded-sm accent-accent aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-danger"
                />
                I agree to the Terms of Use, acknowledge the Privacy Policy, and confirm I&apos;m at least 18 years old.
              </label>
            )}

            {/* Logging in swaps sessions; a guest's images stay with the guest user, so say it before they click. */}
            {isLogin && account?.status === "anonymous" && (
              <p className="rounded-lg bg-bg-2 px-3 py-2.5 text-xs leading-4.5 text-text-2">
                You&apos;re using a guest session. Images you made as a guest in this browser won&apos;t carry over when
                you log in to another account.
              </p>
            )}

            <div role="alert" className="empty:hidden">
              {formError?.kind === "exists" && (
                <div className="flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger/8 px-3 py-2.5 text-xs leading-4.5 text-text-1">
                  <p className="flex items-start gap-2">
                    <AlertIcon className="mt-px size-4 shrink-0 text-danger" />
                    <span>
                      That email already has an account. Log in instead. Images you made as a guest in this browser
                      won&apos;t carry over to it.
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => switchTab("login")}
                    className="self-start pl-6 font-semibold text-accent-text transition-colors duration-150 hover:text-accent-hover"
                  >
                    Log in instead
                  </button>
                </div>
              )}
              {formError?.kind === "message" && (
                <p className="flex items-start gap-2 text-xs leading-4.5 text-danger">
                  <AlertIcon className="mt-px size-4 shrink-0" />
                  {formError.text}
                </p>
              )}
              {attempted && termsError && !formError && <p className="text-xs leading-4.5 text-danger">{termsError}</p>}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-[15px] font-semibold text-accent-ink inset-shadow-lip transition-[filter,translate] duration-150 enabled:hover:brightness-110 enabled:active:translate-y-px enabled:active:inset-shadow-lip-pressed disabled:bg-brand-gradient-muted disabled:text-accent-ink/70 disabled:inset-shadow-none"
            >
              {pending ? (
                <>
                  <SpinnerIcon className="size-4 motion-safe:animate-spin" />
                  {isLogin ? "Logging in…" : "Creating account…"}
                </>
              ) : isLogin ? (
                "Log in"
              ) : (
                <>
                  <GiftIcon className="size-4" />
                  Sign up &amp; get {UPGRADE_BONUS} credits
                </>
              )}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3 text-xs text-text-3">
            <span className="h-px flex-1 bg-border-1" />
            OR
            <span className="h-px flex-1 bg-border-1" />
          </div>
          <button
            type="button"
            onClick={() => setProviderNote(true)}
            aria-disabled
            className="mt-5 flex h-12 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-lg border border-border-3 bg-bg-1 text-sm font-semibold text-text-disabled"
          >
            <GoogleIcon className="size-4.5 opacity-50" />
            Continue with Google
            <span className="flex h-4 items-center rounded-xs bg-accent-badge-bg px-1 text-[10px] leading-3 font-semibold text-accent-text">
              Soon
            </span>
          </button>
          <p role="status" className="mt-2 min-h-4.5 text-center text-xs text-text-2">
            {providerNote && "Google sign-in is coming soon. Use email for now."}
          </p>
        </div>
      )}
    </div>
  );
}

// Each line rises in a beat after the one above; fill-mode both keeps it hidden until its turn.
const STAGGER = "motion-safe:animate-rise-in motion-reduce:animate-fade-in [animation-fill-mode:both]";

function Welcome({ email, granted, credits }: { email: string; granted: boolean; credits: number | null }) {
  const router = useRouter();
  const { closeAuthModal } = useApp();

  function start() {
    closeAuthModal();
    router.push("/image");
  }

  return (
    <div role="status" className="my-auto flex w-full max-w-96 flex-col items-center text-center">
      <div className="relative isolate flex size-28 items-center justify-center">
        {/* The logo colors swirling behind the mark: the same glow as a generating tile, so it reads as ours. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-brand-conic opacity-60 blur-2xl motion-safe:animate-aurora"
        />
        <div className="flex size-20 items-center justify-center rounded-full bg-bg-2 ring-1 ring-white/10 motion-safe:animate-pop-in">
          <SparkleIcon gradient className="size-10 motion-safe:animate-breathe" />
        </div>
      </div>

      {granted ? (
        <>
          <p className={`mt-6 font-display text-[72px] leading-[64px] uppercase ${STAGGER} [animation-delay:80ms]`}>
            <span className="text-brand-gradient">+{UPGRADE_BONUS}</span>
          </p>
          <p className={`text-sm font-semibold tracking-[0.08em] text-text-2 uppercase ${STAGGER} [animation-delay:80ms]`}>
            bonus credits
          </p>
          <h2 id="auth-modal-title" className={`mt-6 text-title font-semibold ${STAGGER} [animation-delay:180ms]`}>
            You&apos;re in!
          </h2>
        </>
      ) : (
        <h2 id="auth-modal-title" className={`mt-6 text-title font-semibold ${STAGGER} [animation-delay:80ms]`}>
          You&apos;re signed up
        </h2>
      )}

      <p className={`mt-2 text-sm text-text-2 ${STAGGER} [animation-delay:240ms]`}>
        Your account is set up as <span className="break-all text-text-1">{email}</span>. Everything you made as a
        guest is saved to it.
        {!granted && " Your bonus credits couldn't be added just now; they'll land the next time you log in."}
      </p>

      {credits !== null && (
        <p
          className={`mt-5 flex h-9 items-center gap-2 rounded-full border border-border-3 bg-bg-3 px-4 text-sm ${STAGGER} [animation-delay:300ms]`}
        >
          <SparkleIcon gradient className="size-3.5" />
          <span className="text-text-2">Balance</span>
          <span className="font-semibold tabular-nums">{credits} credits</span>
        </p>
      )}

      <button
        type="button"
        onClick={start}
        className={`mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-[15px] font-semibold text-accent-ink inset-shadow-lip transition-[filter,translate] duration-150 hover:brightness-110 active:translate-y-px active:inset-shadow-lip-pressed ${STAGGER} [animation-delay:360ms]`}
      >
        <SparkleIcon className="size-4" />
        Start creating
      </button>
      <button
        type="button"
        onClick={closeAuthModal}
        className={`mt-3 text-sm font-medium text-text-2 transition-colors duration-150 hover:text-text-1 ${STAGGER} [animation-delay:400ms]`}
      >
        Back to where I was
      </button>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-text-2">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-error`} className="text-xs text-text-3">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
