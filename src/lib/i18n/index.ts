// No i18n library and no /[locale] routes: a cookie picks the dictionary, and the root layout
// reads it on every request. tr and ru are partial; a missing key falls back to English.
import { en, type MessageKey } from "./en";
import { ru } from "./ru";
import { tr } from "./tr";

export type { MessageKey };

export const LOCALES = ["en", "tr", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

// Each language names itself, so a visitor who can't read the current one can still find theirs.
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", tr: "Türkçe", ru: "Русский" };

const DICTIONARIES: Record<Locale, Partial<Record<MessageKey, string>>> = { en, tr, ru };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export type Params = Record<string, string | number>;
export type T = (key: MessageKey, params?: Params) => string;

// "{n}" inserts a param. "{n|one:кредит|few:кредита|many:кредитов}" picks a word by the
// locale's plural rule for n, which Russian needs for counts (1 кредит, 2 кредита, 5 кредитов).
export function makeT(locale: Locale): T {
  const dict = DICTIONARIES[locale];
  const plural = new Intl.PluralRules(locale);
  return (key, params) => {
    const template = dict[key] ?? en[key];
    if (!params) return template;
    return template.replace(/\{(\w+)(?:\|([^}]+))?\}/g, (match, name: string, forms?: string) => {
      if (!(name in params)) return match;
      const value = params[name];
      if (!forms) return String(value);
      const byCategory = Object.fromEntries(forms.split("|").map((f) => f.split(":") as [string, string]));
      const category = typeof value === "number" ? plural.select(value) : "other";
      return byCategory[category] ?? byCategory.other ?? Object.values(byCategory)[0] ?? "";
    });
  };
}

export function isMessageKey(value: string): value is MessageKey {
  return Object.hasOwn(en, value);
}
