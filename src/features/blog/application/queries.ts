import "server-only";

import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { getDb } from "@/db/client";
import { blogPosts, mediaAssets } from "@/db/schema";
import {
  resolveBlogTranslation,
  type BlogLocaleCopy,
  type BlogPostStatus,
  type BlogTranslations,
} from "@/features/blog/domain/blog-rules";
import {
  CACHE_TAGS,
  PUBLIC_CACHE_REVALIDATE_SECONDS,
} from "@/lib/cache/tags";
import { locales, type Locale } from "@/lib/i18n/config";
import { mediaPublicUrl } from "@/lib/media/public-url";

export type AdminBlogPost = typeof blogPosts.$inferSelect;

export type AdminBlogListItem = {
  id: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  title: string;
  excerpt: string;
  slug: string;
  path: string;
  coverUrl: string | null;
  tags: string[];
  translations: BlogTranslations;
};

export type StorefrontBlogPostListItem = {
  id: string;
  /** ISO-8601 string — Date cannot survive `unstable_cache` JSON round-trip. */
  publishedAt: string | null;
  tags: string[];
  coverUrl: string | null;
  copy: BlogLocaleCopy;
};

function toPublishedAtIso(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export type StorefrontBlogPost = StorefrontBlogPostListItem;

async function loadBlogCoverUrls(
  blogPostIds: string[],
): Promise<Map<string, string>> {
  const images = new Map<string, string>();
  if (blogPostIds.length === 0) {
    return images;
  }

  const mediaRows = await getDb()
    .select({
      blogPostId: mediaAssets.blogPostId,
      objectKey: mediaAssets.objectKey,
    })
    .from(mediaAssets)
    .where(
      and(
        inArray(mediaAssets.blogPostId, blogPostIds),
        eq(mediaAssets.uploadStatus, "READY"),
        or(
          eq(mediaAssets.isPrimary, true),
          eq(mediaAssets.role, "COVER"),
          eq(mediaAssets.role, "PRIMARY"),
        ),
      ),
    );

  for (const media of mediaRows) {
    if (!media.blogPostId || images.has(media.blogPostId)) continue;
    images.set(media.blogPostId, mediaPublicUrl(media.objectKey));
  }

  return images;
}

/** Lists all non-deleted blog posts for admin UI. */
export async function listAdminBlogPosts(
  locale: Locale,
): Promise<AdminBlogListItem[]> {
  const rows = await getDb()
    .select()
    .from(blogPosts)
    .where(isNull(blogPosts.deletedAt))
    .orderBy(desc(blogPosts.updatedAt), desc(blogPosts.createdAt));

  const images = await loadBlogCoverUrls(rows.map((row) => row.id));

  return rows.map((row) => {
    const copy = resolveBlogTranslation(row.translations, locale);
    const slug = copy?.slug ?? "";
    return {
      id: row.id,
      status: row.status,
      publishedAt: toPublishedAtIso(row.publishedAt)?.slice(0, 10) ?? null,
      title: copy?.title ?? "Untitled",
      excerpt: copy?.excerpt ?? "",
      slug,
      path: slug ? `/blog/${slug}` : "/blog",
      coverUrl: images.get(row.id) ?? null,
      tags: row.tags,
      translations: row.translations,
    };
  });
}

/** Loads one blog post by id for admin. */
export async function getAdminBlogPostById(
  id: string,
): Promise<AdminBlogPost | null> {
  const [row] = await getDb()
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)))
    .limit(1);

  return row ?? null;
}

async function loadPublishedBlogPosts(
  locale: Locale,
): Promise<StorefrontBlogPostListItem[]> {
  const rows = await getDb()
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.status, "PUBLISHED"),
        isNull(blogPosts.deletedAt),
        isNotNull(blogPosts.publishedAt),
      ),
    )
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));

  const images = await loadBlogCoverUrls(rows.map((row) => row.id));

  return rows
    .map((row) => {
      const copy = resolveBlogTranslation(row.translations, locale);
      if (!copy) {
        return null;
      }
      return {
        id: row.id,
        publishedAt: toPublishedAtIso(row.publishedAt),
        tags: row.tags,
        coverUrl: images.get(row.id) ?? null,
        copy,
      };
    })
    .filter((row): row is StorefrontBlogPostListItem => row !== null);
}

/** Published blog posts visible on the storefront for a locale. */
export async function listPublishedBlogPosts(
  locale: Locale,
): Promise<StorefrontBlogPostListItem[]> {
  return unstable_cache(
    async () => loadPublishedBlogPosts(locale),
    ["published-blog-posts", locale],
    {
      tags: [CACHE_TAGS.blog],
      revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    },
  )();
}

/** Matches a slug against any locale translation (for locale-switch URLs). */
function blogSlugMatchesAnyLocale(slug: string) {
  return or(
    ...locales.map(
      (loc) => sql`${blogPosts.translations}->${loc}->>'slug' = ${slug}`,
    ),
  );
}

async function loadPublishedBlogPostBySlug(
  locale: Locale,
  slug: string,
): Promise<StorefrontBlogPost | null> {
  const [row] = await getDb()
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.status, "PUBLISHED"),
        isNull(blogPosts.deletedAt),
        isNotNull(blogPosts.publishedAt),
        blogSlugMatchesAnyLocale(slug),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const copy = resolveBlogTranslation(row.translations, locale);
  if (!copy) {
    return null;
  }

  const images = await loadBlogCoverUrls([row.id]);

  return {
    id: row.id,
    publishedAt: toPublishedAtIso(row.publishedAt),
    tags: row.tags,
    coverUrl: images.get(row.id) ?? null,
    copy,
  };
}

/**
 * Loads one published blog post by slug.
 * Accepts any locale's slug so language switching can resolve the same post,
 * then the page redirects to the canonical slug for the active locale.
 */
export const getPublishedBlogPostBySlug = cache(
  async (
    locale: Locale,
    slug: string,
  ): Promise<StorefrontBlogPost | null> => {
    return unstable_cache(
      async () => loadPublishedBlogPostBySlug(locale, slug),
      ["published-blog-post", locale, slug],
      {
        tags: [CACHE_TAGS.blogPostSlug(locale, slug)],
        revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
      },
    )();
  },
);
