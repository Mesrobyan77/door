import "server-only";

import { updateTag } from "next/cache";

import type { TranslationsJson } from "@/db/schema";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { locales } from "@/lib/i18n/config";

function collectTranslationSlugs(
  translations?: TranslationsJson,
  slug?: string,
): string[] {
  const slugs = new Set<string>();
  if (slug) {
    slugs.add(slug);
  }
  if (translations) {
    for (const locale of locales) {
      const value = translations[locale]?.slug;
      if (value) {
        slugs.add(value);
      }
    }
  }
  return [...slugs];
}

/** Invalidates catalog list caches and optional per-product / per-slug PDP caches. */
export function invalidateProductsCache(input?: {
  productId?: string;
  slug?: string;
  translations?: TranslationsJson;
  /** When true, busts every PDP (promotions / category-wide price changes). */
  allProductDetails?: boolean;
}): void {
  updateTag(CACHE_TAGS.products);
  if (input?.allProductDetails) {
    updateTag(CACHE_TAGS.productDetail);
  }
  if (input?.productId) {
    updateTag(CACHE_TAGS.product(input.productId));
  }
  for (const slug of collectTranslationSlugs(input?.translations, input?.slug)) {
    for (const locale of locales) {
      updateTag(CACHE_TAGS.productSlug(locale, slug));
    }
  }
}

/** Invalidates blog list caches and optional per-post / per-slug detail caches. */
export function invalidateBlogCache(input?: {
  postId?: string;
  slug?: string;
  translations?: TranslationsJson;
}): void {
  updateTag(CACHE_TAGS.blog);
  if (input?.postId) {
    updateTag(CACHE_TAGS.blogPost(input.postId));
  }
  for (const slug of collectTranslationSlugs(input?.translations, input?.slug)) {
    for (const locale of locales) {
      updateTag(CACHE_TAGS.blogPostSlug(locale, slug));
    }
  }
}
