import type { Locale } from "@/lib/i18n/config";

export const BLOG_POST_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];

export type BlogLocaleCopy = {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type BlogTranslations = Partial<Record<Locale, BlogLocaleCopy>>;

export type BlogRuleError =
  | "TITLE_REQUIRED"
  | "SLUG_REQUIRED"
  | "CONTENT_REQUIRED"
  | "INVALID_SLUG";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isBlogPostStatus(value: string): value is BlogPostStatus {
  return (BLOG_POST_STATUSES as readonly string[]).includes(value);
}

export function canPublishBlogPost(status: BlogPostStatus): boolean {
  return status === "DRAFT" || status === "ARCHIVED";
}

export function canArchiveBlogPost(status: BlogPostStatus): boolean {
  return status === "PUBLISHED";
}

export function isPublishedBlogPost(status: BlogPostStatus): boolean {
  return status === "PUBLISHED";
}

/** Lowercases and hyphenates a slug for storage and lookup. */
export function normalizeBlogSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function validateBlogLocaleCopy(
  copy: BlogLocaleCopy,
): BlogRuleError | null {
  if (!copy.title.trim()) {
    return "TITLE_REQUIRED";
  }

  const slug = normalizeBlogSlug(copy.slug);
  if (!slug) {
    return "SLUG_REQUIRED";
  }

  if (!SLUG_PATTERN.test(slug)) {
    return "INVALID_SLUG";
  }

  if (!copy.content.trim()) {
    return "CONTENT_REQUIRED";
  }

  return null;
}

export function validateBlogTranslations(
  translations: BlogTranslations,
): BlogRuleError | null {
  const locales = Object.keys(translations) as Locale[];
  if (locales.length === 0) {
    return "TITLE_REQUIRED";
  }

  for (const locale of locales) {
    const copy = translations[locale];
    if (!copy) {
      continue;
    }
    const error = validateBlogLocaleCopy({
      ...copy,
      slug: normalizeBlogSlug(copy.slug),
    });
    if (error) {
      return error;
    }
  }

  return null;
}

export function blogRuleErrorMessage(code: BlogRuleError): string {
  switch (code) {
    case "TITLE_REQUIRED":
      return "Title is required.";
    case "SLUG_REQUIRED":
      return "Slug is required.";
    case "CONTENT_REQUIRED":
      return "Content is required.";
    case "INVALID_SLUG":
      return "Slug must use lowercase letters, numbers, and hyphens.";
  }
}

/** Picks the best available blog translation for a locale with fallbacks. */
export function resolveBlogTranslation(
  translations: BlogTranslations,
  locale: Locale,
): BlogLocaleCopy | null {
  return (
    translations[locale] ??
    translations.en ??
    translations.hy ??
    translations.ru ??
    null
  );
}
