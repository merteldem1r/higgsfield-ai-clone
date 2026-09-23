"use client";

import { useState } from "react";

import { useApp } from "@/components/app-provider";
import { CheckIcon, SparkleIcon, XIcon } from "@/components/icons";
import { MODELS } from "@/lib/credits";

import { ANNUAL_DISCOUNT, imagesFor, PLANS, priceFor, type Plan } from "./plans-data";

const CARD: Record<Plan["id"], string> = {
  starter: "border-border-2 bg-bg-1",
  plus: "border-accent/40 bg-plan-plus shadow-brand-glow-soft",
  ultra: "border-brand-pink/30 bg-plan-ultra",
};

const CTA: Record<Plan["id"], string> = {
  starter: "bg-white text-black hover:bg-white/85",
  plus: "bg-brand-gradient text-accent-ink inset-shadow-lip hover:brightness-110 active:translate-y-px active:inset-shadow-lip-pressed",
  ultra: "bg-brand-pink text-accent-ink inset-shadow-lip hover:brightness-110 active:translate-y-px active:inset-shadow-lip-pressed",
};

const USD = new Intl.NumberFormat("en-US");

export function Plans() {
  const [annual, setAnnual] = useState(true);
  const { showToast } = useApp();
  const percentOff = `${Math.round(ANNUAL_DISCOUNT * 100)}% OFF`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label="Bill annually"
          onClick={() => setAnnual((a) => !a)}
          className="flex h-10 items-center gap-3 rounded-lg border border-border-3 bg-bg-1 px-3.5 text-sm font-medium transition-colors duration-150 hover:bg-bg-3"
        >
          <span className={annual ? "text-text-2" : "text-text-1"}>Monthly</span>
          <span
            className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${annual ? "bg-brand-gradient" : "bg-bg-5"}`}
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-white shadow-photo transition-[left] duration-200 ease-out ${
                annual ? "left-4.5" : "left-0.5"
              }`}
            />
          </span>
          <span className={annual ? "text-text-1" : "text-text-2"}>Annual</span>
          <Badge className="bg-brand-pink text-accent-ink">{percentOff}</Badge>
        </button>
      </div>

      <ul className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const price = priceFor(plan, annual);
          const images = imagesFor(plan.credits);
          const yearlySaving = (plan.monthlyUsd - price) * 12;

          return (
            <li key={plan.id} className={`flex flex-col rounded-2xl border p-5 ${CARD[plan.id]}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[28px] leading-7 uppercase">{plan.name}</h3>
                {annual && <Badge className="bg-brand-pink text-accent-ink">{percentOff}</Badge>}
                {plan.badge === "popular" && <Badge className="bg-brand-gradient text-accent-ink">Most popular</Badge>}
                {plan.badge === "best-value" && <Badge className="bg-sky text-white">Best value</Badge>}
              </div>
              <p className="mt-1.5 text-sm text-text-2">{plan.tagline}</p>

              <div className="mt-5 rounded-xl bg-black/25 p-4 ring-1 ring-white/5">
                <p className="flex items-center gap-2 text-[15px] font-semibold">
                  <SparkleIcon gradient className="size-4" />
                  {USD.format(plan.credits)} credits / month
                </p>
                <p className="mt-2 pl-6 text-xs leading-5 text-text-2">
                  ≈ {USD.format(images.schnell)} {MODELS["flux-schnell"].label} images
                  <br />≈ {USD.format(images.dev)} {MODELS["flux-dev"].label} images
                </p>
              </div>

              <p className="mt-6 flex items-baseline gap-2">
                {annual && (
                  <s className="font-display text-[32px] leading-8 text-brand-pink decoration-2">${plan.monthlyUsd}</s>
                )}
                <span className="font-display text-[40px] leading-10">${price}</span>
                <span className="text-sm text-text-2">/ month{annual ? ", billed annually" : ""}</span>
              </p>

              <button
                type="button"
                onClick={() =>
                  showToast({
                    tone: "neutral",
                    text: "Payments aren't live in this demo. Your free credits are still yours to use.",
                  })
                }
                className={`mt-4 flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold transition-[background-color,filter,translate] duration-150 ${CTA[plan.id]}`}
              >
                Get {plan.name}
              </button>
              <p className="mt-2.5 text-center text-xs text-text-2">
                {annual ? (
                  <>
                    <span className="font-semibold text-text-1">Save ${yearlySaving}</span> a year compared to monthly
                  </>
                ) : (
                  <>Switch to annual to save {Math.round(ANNUAL_DISCOUNT * 100)}%</>
                )}
              </p>

              <ul className="mt-5 flex flex-col gap-2.5 border-t border-white/6 pt-5">
                {plan.features.map((feature) => (
                  <li
                    key={feature.label}
                    className={`flex items-center gap-2.5 text-sm ${feature.included ? "text-text-1" : "text-text-disabled"}`}
                  >
                    {feature.included ? (
                      <CheckIcon className="size-4 shrink-0 text-accent-text" />
                    ) : (
                      <XIcon className="size-4 shrink-0" />
                    )}
                    {feature.label}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Badge({ children, className }: { children: string; className: string }) {
  return (
    <span className={`flex h-5 items-center rounded-xs px-1.5 text-[10px] leading-3 font-bold tracking-[0.02em] uppercase italic ${className}`}>
      {children}
    </span>
  );
}
