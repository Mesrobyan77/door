export const locales = ["hy", "en", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "hy";

export const localeLabels: Record<Locale, string> = {
  hy: "Հայերեն",
  en: "English",
  ru: "Русский",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
