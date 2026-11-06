import type { Locale } from "@/lib/i18n/config";

export type HeroLocaleCopy = {
  title: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonUrl?: string;
};

export type HeroTranslations = Partial<Record<Locale, HeroLocaleCopy>>;

const BUTTON_URL_PATTERN = /^(?:\/[A-Za-z0-9/_-]*)|(?:https?:\/\/.+)$/;

export type HeroRuleError =
  | "TITLE_REQUIRED"
  | "INVALID_BUTTON_URL"
  | "BUTTON_LABEL_WITHOUT_URL"
  | "BUTTON_URL_WITHOUT_LABEL";

/** Validates one locale's hero copy. */
export function validateHeroLocaleCopy(
  copy: HeroLocaleCopy,
): HeroRuleError | null {
  if (!copy.title.trim()) {
    return "TITLE_REQUIRED";
  }

  const label = copy.buttonLabel?.trim() ?? "";
  const url = copy.buttonUrl?.trim() ?? "";

  if (label && !url) {
    return "BUTTON_LABEL_WITHOUT_URL";
  }

  if (url && !label) {
    return "BUTTON_URL_WITHOUT_LABEL";
  }

  if (url && !BUTTON_URL_PATTERN.test(url)) {
    return "INVALID_BUTTON_URL";
  }

  return null;
}

/** Validates that every provided locale translation is valid. */
export function validateHeroTranslations(
  translations: HeroTranslations,
): HeroRuleError | null {
  const locales = Object.keys(translations) as Locale[];
  if (locales.length === 0) {
    return "TITLE_REQUIRED";
  }

  for (const locale of locales) {
    const copy = translations[locale];
    if (!copy) {
      continue;
    }
    const error = validateHeroLocaleCopy(copy);
    if (error) {
      return error;
    }
  }

  return null;
}

export function heroRuleErrorMessage(code: HeroRuleError): string {
  switch (code) {
    case "TITLE_REQUIRED":
      return "Title is required for each locale.";
    case "INVALID_BUTTON_URL":
      return "Button URL must be a site path or http(s) URL.";
    case "BUTTON_LABEL_WITHOUT_URL":
      return "Button label requires a URL.";
    case "BUTTON_URL_WITHOUT_LABEL":
      return "Button URL requires a label.";
  }
}

/** Picks the best available translation for a locale with fallbacks. */
export function resolveHeroTranslation(
  translations: HeroTranslations,
  locale: Locale,
): HeroLocaleCopy | null {
  return (
    translations[locale] ??
    translations.en ??
    translations.hy ??
    translations.ru ??
    null
  );
}
