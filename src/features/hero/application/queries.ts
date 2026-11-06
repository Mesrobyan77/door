import "server-only";

import { and, asc, eq, inArray, or } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { getDb } from "@/db/client";
import { heroSlides, mediaAssets } from "@/db/schema";
import {
  resolveHeroTranslation,
  type HeroLocaleCopy,
} from "@/features/hero/domain/hero-rules";
import {
  CACHE_TAGS,
  PUBLIC_CACHE_REVALIDATE_SECONDS,
} from "@/lib/cache/tags";
import type { Locale } from "@/lib/i18n/config";
import { mediaPublicUrl } from "@/lib/media/public-url";

export type AdminHeroSlide = typeof heroSlides.$inferSelect;

export type AdminHeroSlideListItem = {
  id: string;
  sortOrder: number;
  isActive: boolean;
  title: string;
  subtitle: string | undefined;
  imageUrl: string | null;
};

export type StorefrontHeroSlide = {
  id: string;
  sortOrder: number;
  copy: HeroLocaleCopy;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
};

async function loadHeroMediaBySlideIds(
  slideIds: string[],
): Promise<Map<string, { desktop: string | null; mobile: string | null }>> {
  const map = new Map<
    string,
    { desktop: string | null; mobile: string | null }
  >();

  if (slideIds.length === 0) {
    return map;
  }

  const rows = await getDb()
    .select({
      heroSlideId: mediaAssets.heroSlideId,
      role: mediaAssets.role,
      objectKey: mediaAssets.objectKey,
    })
    .from(mediaAssets)
    .where(
      and(
        inArray(mediaAssets.heroSlideId, slideIds),
        eq(mediaAssets.uploadStatus, "READY"),
        or(
          eq(mediaAssets.role, "HERO_DESKTOP"),
          eq(mediaAssets.role, "HERO_MOBILE"),
        ),
      ),
    );

  for (const row of rows) {
    if (!row.heroSlideId) {
      continue;
    }
    const current = map.get(row.heroSlideId) ?? {
      desktop: null,
      mobile: null,
    };
    const url = mediaPublicUrl(row.objectKey);
    if (row.role === "HERO_DESKTOP") {
      current.desktop = url;
    }
    if (row.role === "HERO_MOBILE") {
      current.mobile = url;
    }
    map.set(row.heroSlideId, current);
  }

  return map;
}

/** Lists all hero slides for the admin CMS, ordered by sort then created. */
export async function listAdminHeroSlides(): Promise<AdminHeroSlideListItem[]> {
  const rows = await getDb()
    .select()
    .from(heroSlides)
    .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.createdAt));

  const mediaBySlide = await loadHeroMediaBySlideIds(rows.map((row) => row.id));

  return rows.map((row) => {
    const copy =
      row.translations.en ??
      row.translations.hy ??
      row.translations.ru ??
      { title: "" };
    const media = mediaBySlide.get(row.id);

    return {
      id: row.id,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      title: copy.title || "Untitled",
      subtitle: copy.subtitle,
      imageUrl: media?.desktop ?? media?.mobile ?? null,
    };
  });
}

/** Loads one hero slide by id. */
export async function getAdminHeroSlideById(
  id: string,
): Promise<AdminHeroSlide | null> {
  const [row] = await getDb()
    .select()
    .from(heroSlides)
    .where(eq(heroSlides.id, id))
    .limit(1);

  return row ?? null;
}

async function loadActiveHeroSlides(
  locale: Locale,
): Promise<StorefrontHeroSlide[]> {
  const rows = await getDb()
    .select()
    .from(heroSlides)
    .where(eq(heroSlides.isActive, true))
    .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.createdAt));

  const withCopy = rows
    .map((row) => {
      const copy = resolveHeroTranslation(row.translations, locale);
      if (!copy) {
        return null;
      }
      return { id: row.id, sortOrder: row.sortOrder, copy };
    })
    .filter(
      (row): row is { id: string; sortOrder: number; copy: HeroLocaleCopy } =>
        row !== null,
    );

  const mediaBySlide = await loadHeroMediaBySlideIds(
    withCopy.map((slide) => slide.id),
  );

  return withCopy.map((slide) => {
    const media = mediaBySlide.get(slide.id);
    return {
      ...slide,
      desktopImageUrl: media?.desktop ?? null,
      mobileImageUrl: media?.mobile ?? media?.desktop ?? null,
    };
  });
}

/** Active hero slides resolved for the storefront locale, with admin media. */
export async function listActiveHeroSlides(
  locale: Locale,
): Promise<StorefrontHeroSlide[]> {
  return unstable_cache(
    async () => loadActiveHeroSlides(locale),
    ["active-hero-slides", locale],
    {
      tags: [CACHE_TAGS.hero],
      revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    },
  )();
}

