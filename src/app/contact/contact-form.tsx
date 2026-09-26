"use client";

import { useState, type FormEvent } from "react";

import { useT } from "@/components/locale-provider";
import type { MessageKey } from "@/lib/i18n";

// Each topic is a step of the spectrum; the chosen one lights its dot and name.
const TOPICS: { id: string; label: MessageKey; text: string; dot: string }[] = [
  { id: "bug", label: "contact.topic.bug", text: "text-brand-sky", dot: "bg-brand-sky" },
  { id: "feedback", label: "contact.topic.feedback", text: "text-brand-violet", dot: "bg-brand-violet" },
  { id: "credits", label: "contact.topic.credits", text: "text-brand-pink", dot: "bg-brand-pink" },
  { id: "other", label: "contact.topic.other", text: "text-brand-peach", dot: "bg-brand-peach" },
];

const FIELD =
  "h-10 w-full rounded-md bg-bg-2 px-3 text-sm text-text-1 outline-none transition-colors duration-150 placeholder:text-text-placeholder focus-visible:bg-bg-3 focus-visible:ring-1 focus-visible:ring-accent/60";

// No backend: Send opens the visitor's mail app with the message prefilled, addressed to CONTACT_EMAIL.
export function ContactForm({ to }: { to: string }) {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0].id);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const topicLabel = t(TOPICS.find((item) => item.id === topic)?.label ?? "contact.topic.other");
    const subject = `[Darkroom] ${topicLabel}`;
    const body = `${message.trim()}\n\n${name.trim()}${email.trim() ? ` <${email.trim()}>` : ""}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
          {t("contact.name")}
          <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
          {t("contact.email")}
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={FIELD} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium text-text-2">{t("contact.topic")}</legend>
        <div className="flex flex-wrap gap-1 rounded-md bg-bg-1 p-1 self-start">
          {TOPICS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={topic === item.id}
              onClick={() => setTopic(item.id)}
              className={`flex h-8 items-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors duration-150 ${
                topic === item.id ? `bg-bg-3 ${item.text}` : "text-text-2 hover:text-text-1"
              }`}
            >
              <span aria-hidden className={`size-1.5 rounded-full transition-colors duration-150 ${topic === item.id ? item.dot : "bg-bg-3"}`} />
              {t(item.label)}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
        {t("contact.message")}
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("contact.messagePlaceholder")}
          className="field-sizing-content max-h-80 min-h-30 w-full resize-none rounded-md bg-bg-2 px-3 py-2.5 text-sm leading-6 text-text-1 outline-none transition-colors duration-150 placeholder:text-text-placeholder focus-visible:bg-bg-3 focus-visible:ring-1 focus-visible:ring-accent/60"
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="submit"
          disabled={message.trim() === ""}
          className="flex h-9 items-center justify-center rounded-md bg-text-1 px-4 text-sm font-semibold text-bg-0 transition-colors duration-150 hover:bg-white disabled:bg-bg-3 disabled:text-text-disabled"
        >
          {t("contact.send")}
        </button>
        <p role="status" className="text-xs text-text-2">
          {sent ? (
            <span key="sent" className="block motion-safe:animate-rise-in motion-reduce:animate-fade-in">
              {t("contact.sent", { email: to })}
            </span>
          ) : (
            t("contact.opensMail")
          )}
        </p>
      </div>
    </form>
  );
}
