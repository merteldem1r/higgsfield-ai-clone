import type { Metadata } from "next";
import Link from "next/link";

import { ChevronUpIcon, TagIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { FREE_CREDITS, MODELS, UPGRADE_BONUS } from "@/lib/credits";

import { Plans } from "./plans";
import { SignUpButton } from "./sign-up-button";

export const metadata: Metadata = { title: "Pricing — Higgsfield AI Clone" };

const schnell = MODELS["flux-schnell"];
const dev = MODELS["flux-dev"];

// Answers describe how this demo really behaves; the plans above are the only illustrative part.
const FAQ = [
  {
    q: "How do credits work?",
    a: `Every image costs credits, set per model: ${schnell.label} costs ${schnell.credits} and ${dev.label} costs ${dev.credits}, multiplied by how many images you ask for. The exact cost is on the Generate button before you click.`,
  },
  {
    q: "What do I get without signing up?",
    a: `${FREE_CREDITS} credits the moment you generate your first image. That's ${Math.floor(FREE_CREDITS / schnell.credits)} ${schnell.label} images or ${Math.floor(FREE_CREDITS / dev.credits)} ${dev.label} image. No email, no card.`,
  },
  {
    q: "What happens if a generation fails?",
    a: "You only pay for images that are delivered. If the provider fails or times out, the full cost goes straight back to your balance, and the chat tells you it did.",
  },
  {
    q: "Can I actually buy a plan?",
    a: "Not yet. Payments aren't live in this demo, so nothing is charged, renewed or rolled over. The plans show how pricing would work once they are.",
  },
  {
    q: "Why is there a daily limit?",
    a: "To keep a free, no-signup demo fair, each network has a daily image limit and there's a shared daily budget. When either is reached, generating pauses until the next day; your gallery stays available.",
  },
  {
    q: "Is this Higgsfield?",
    a: "No. It's an independent clone built as a take-home demo, and it isn't affiliated with or endorsed by Higgsfield.",
  },
];

export default function PricingPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 pb-10">
        <section className="relative overflow-hidden rounded-2xl border border-white/8 bg-bg-1 bg-promo px-6 py-7 sm:px-8 sm:py-9">
          <span className="inline-flex h-5 items-center gap-1 rounded-xs bg-brand-pink px-1.5 text-[10px] leading-3 font-bold tracking-[0.02em] text-accent-ink uppercase italic">
            <TagIcon className="size-2.5" />
            Sign-up bonus
          </span>
          <h2 className="mt-4 font-display text-display-sm uppercase sm:text-display">
            <span className="text-brand-gradient">{UPGRADE_BONUS} extra credits</span>
            <br />
            when you create an account
          </h2>
          <p className="mt-3 max-w-lg text-sm text-text-2">
            Keep everything you made as a guest. Your gallery comes with you, and the bonus lands on top of your free
            credits.
          </p>
          <SignUpButton className="mt-6 flex h-10 items-center rounded-md bg-white px-4 text-sm font-semibold text-black transition-colors duration-150 hover:bg-white/85">
            Sign up for {UPGRADE_BONUS} credits
          </SignUpButton>
        </section>

        <section aria-labelledby="plans-title" className="mt-16">
          <h1 id="plans-title" className="text-[40px] leading-11 font-semibold tracking-[-0.02em]">
            Upgrade your plan
          </h1>
          <p className="mt-2 text-sm text-text-2">
            Every visitor starts with {FREE_CREDITS} free credits, no signup. Plans add a monthly allowance on top.
          </p>
          <div className="mt-8">
            <Plans />
          </div>
          <p className="mt-5 text-center text-xs text-text-3">Demo pricing. No payments are taken.</p>
        </section>

        <section aria-labelledby="faq-title" className="mx-auto mt-24 w-full max-w-2xl">
          <h2 id="faq-title" className="text-center text-[32px] leading-10 font-semibold tracking-[-0.02em]">
            Frequently asked questions
          </h2>
          <div className="mt-8 flex flex-col gap-2.5">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border-2 bg-bg-1 transition-colors duration-150 open:bg-bg-2 hover:border-border-3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronUpIcon className="size-4 shrink-0 rotate-180 text-text-2 transition-transform duration-200 group-open:rotate-0" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-6 text-text-2">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 flex items-center justify-center gap-3 text-sm">
            <span className="text-text-2">Ready to try it?</span>
            <Link
              href="/image"
              className="flex h-9 items-center rounded-md bg-brand-gradient px-3.5 font-semibold text-accent-ink transition-[filter] duration-150 hover:brightness-110"
            >
              Start creating
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
