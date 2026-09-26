"use client";

import { useId, useState, type ReactNode } from "react";

import { useApp } from "@/components/app-provider";
import { CheckIcon, XIcon } from "@/components/icons";
import { useLocale } from "@/components/locale-provider";
import { MODELS } from "@/lib/credits";

import { imagesFor, PLANS, priceFor, type Plan } from "./plans-data";

// One frame per this many Flux Schnell images. The strip is the plan's allowance you can see before you read it.
const IMAGES_PER_FRAME = 25;
const HIGHLIGHT: Plan["id"] = "plus";

const schnell = MODELS["flux-schnell"];
const dev = MODELS["flux-dev"];

// Each plan is a step along the logo's spectrum, left to right: the name, the frame strip and the price carry
// its slice, and the rule above the table is the whole gradient the columns sit under.
const TONE: Record<Plan["id"], { text: string; stops: [string, string] }> = {
  starter: { text: "text-brand-sky", stops: ["[stop-color:var(--color-brand-sky)]", "[stop-color:var(--color-brand-violet)]"] },
  plus: { text: "text-brand-pink", stops: ["[stop-color:var(--color-brand-violet)]", "[stop-color:var(--color-brand-pink)]"] },
  ultra: { text: "text-brand-peach", stops: ["[stop-color:var(--color-brand-pink)]", "[stop-color:var(--color-brand-peach)]"] },
};

type Row = { key: "images" | "credits" | "price" | "perImage" | "includes"; label: string; cell: (plan: Plan) => ReactNode };

export function Plans() {
  const [annual, setAnnual] = useState(true);
  const { showToast } = useApp();
  const { locale, t } = useLocale();
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const cents = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 3 });
  const number = new Intl.NumberFormat(locale);

  function choose() {
    showToast({ tone: "neutral", text: t("pricing.paymentsToast") });
  }

  const rows: Row[] = [
    {
      key: "images",
      label: t("pricing.row.images"),
      cell: (plan) => {
        const images = imagesFor(plan.credits);
        return (
          <div className="flex flex-col gap-2">
            <FrameStrip count={Math.ceil(images.schnell / IMAGES_PER_FRAME)} stops={TONE[plan.id].stops} />
            <span className="text-text-1">{t("pricing.approxImages", { n: images.schnell, model: schnell.label })}</span>
            <span className="text-text-2">{t("pricing.approxImages", { n: images.dev, model: dev.label })}</span>
          </div>
        );
      },
    },
    { key: "credits", label: t("pricing.row.credits"), cell: (plan) => <span className="text-text-1">{number.format(plan.credits)}</span> },
    {
      key: "price",
      label: t("pricing.row.price"),
      cell: (plan) => {
        const price = priceFor(plan, annual);
        return (
          <div className="flex flex-col gap-0.5">
            <span className={`text-h3 font-medium ${TONE[plan.id].text}`}>
              {money.format(price)}
              <span className="text-sm font-normal text-text-2"> {t("pricing.month")}</span>
            </span>
            {annual && <span className="text-xs text-text-3">{t("pricing.billedYear", { amount: money.format(price * 12) })}</span>}
          </div>
        );
      },
    },
    {
      key: "perImage",
      label: t("pricing.row.perImage"),
      cell: (plan) => (
        <span className="text-text-1">
          {cents.format(priceFor(plan, annual) / imagesFor(plan.credits).schnell)}
          <span className="text-text-3"> {schnell.label}</span>
        </span>
      ),
    },
    {
      key: "includes",
      label: t("pricing.row.includes"),
      cell: (plan) => (
        <ul className="flex flex-col gap-2">
          {plan.features.map((feature) => (
            <li key={feature.label} className={`flex items-start gap-2 ${feature.included ? "text-text-1" : "text-text-disabled"}`}>
              {feature.included ? <CheckIcon className={`mt-0.5 size-4 shrink-0 ${TONE[plan.id].text}`} /> : <XIcon className="mt-0.5 size-4 shrink-0" />}
              {t(feature.label)}
            </li>
          ))}
        </ul>
      ),
    },
  ];

  const cta = (plan: Plan) => (
    <button
      type="button"
      onClick={choose}
      className={`flex h-9 w-full items-center justify-center rounded-md text-sm font-semibold transition-colors duration-150 ${
        plan.id === HIGHLIGHT ? "bg-text-1 text-bg-0 hover:bg-white" : "bg-bg-2 text-text-1 hover:bg-bg-3"
      }`}
    >
      {t("pricing.get", { plan: plan.name })}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div role="radiogroup" aria-label={t("pricing.billing")} className="flex items-center gap-3 self-end text-sm">
        <span className="text-text-2">{t("pricing.billing")}</span>
        <span className="flex gap-1 rounded-md bg-bg-1 p-1">
          {([false, true] as const).map((isAnnual) => (
            <button
              key={String(isAnnual)}
              type="button"
              role="radio"
              aria-checked={annual === isAnnual}
              onClick={() => setAnnual(isAnnual)}
              className={`flex h-7 items-center rounded-sm px-3 font-medium transition-colors duration-150 ${
                annual === isAnnual ? "bg-bg-3 text-text-1" : "text-text-2 hover:text-text-1"
              }`}
            >
              {isAnnual ? t("pricing.annual") : t("pricing.monthly")}
            </button>
          ))}
        </span>
      </div>

      {/* Desktop: one spec table, plans as columns, so every number lines up against its neighbour. */}
      <div aria-hidden className="hidden h-px bg-brand-gradient lg:block" />
      <table className="hidden w-full border-collapse text-sm lg:table">
        <thead>
          <tr className="align-bottom">
            <td className="w-40" />
            {PLANS.map((plan) => (
              <th key={plan.id} scope="col" className={`rounded-t-lg px-4 pt-5 pb-3 text-left font-normal ${plan.id === HIGHLIGHT ? "bg-bg-1 bg-plan-glow" : ""}`}>
                <span className={`block text-h2 font-medium ${TONE[plan.id].text}`}>{plan.name}</span>
                <span className="block text-text-2">{t(plan.tagline)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-line-1 align-top">
              <th scope="row" className="py-4 pr-4 text-left font-normal text-text-2">
                {row.label}
              </th>
              {PLANS.map((plan) => (
                <td key={plan.id} className={`px-4 py-4 ${plan.id === HIGHLIGHT ? "bg-bg-1" : ""}`}>
                  {row.cell(plan)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-line-1">
            <td />
            {PLANS.map((plan) => (
              <td key={plan.id} className={`px-4 py-4 ${plan.id === HIGHLIGHT ? "rounded-b-lg bg-bg-1" : ""}`}>
                {cta(plan)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Below lg: the same rows, one plan after another. */}
      <div className="flex flex-col gap-4 lg:hidden">
        {PLANS.map((plan) => (
          <section key={plan.id} aria-label={plan.name} className={`relative flex flex-col gap-4 overflow-hidden rounded-lg p-4 ${plan.id === HIGHLIGHT ? "bg-bg-1 bg-plan-glow" : "ring-1 ring-line-1"}`}>
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-brand-gradient" />
            <div>
              <h3 className={`text-h2 font-medium ${TONE[plan.id].text}`}>{plan.name}</h3>
              <p className="text-sm text-text-2">{t(plan.tagline)}</p>
            </div>
            <dl className="flex flex-col gap-3 text-sm">
              {rows.map((row) => (
                <div key={row.key} className="flex flex-col gap-1 border-t border-line-1 pt-3">
                  <dt className="text-xs text-text-2">{row.label}</dt>
                  <dd>{row.cell(plan)}</dd>
                </div>
              ))}
            </dl>
            {cta(plan)}
          </section>
        ))}
      </div>
    </div>
  );
}

// Tiny 16:9 frames, one per 25 Flux Schnell images, 14 to a row, all cut from one gradient in the plan's
// colours. Decorative: the counts next to it carry the numbers.
const PER_ROW = 14;
const FW = 14;
const FH = 8;
const GAP = 2;

function FrameStrip({ count, stops }: { count: number; stops: [string, string] }) {
  const id = useId();
  const rows = Math.ceil(count / PER_ROW);
  const width = Math.min(count, PER_ROW) * (FW + GAP) - GAP;
  const height = rows * (FH + GAP) - GAP;
  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${height}`} className="block h-auto" width={width} height={height}>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={0} x2={width} y1={0} y2={0}>
          <stop offset="0" className={stops[0]} />
          <stop offset="1" className={stops[1]} />
        </linearGradient>
      </defs>
      {Array.from({ length: count }, (_, i) => (
        <rect key={i} x={(i % PER_ROW) * (FW + GAP)} y={Math.floor(i / PER_ROW) * (FH + GAP)} width={FW} height={FH} rx={2} fill={`url(#${id})`} />
      ))}
    </svg>
  );
}
