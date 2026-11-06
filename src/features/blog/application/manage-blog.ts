"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  auditLogs,
  blogPosts,
  type BlogTranslationsJson,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  persistBlogCoverImage,
  removeBlogCoverImage,
} from "@/features/blog/application/persist-blog-media";
import {
  blogRuleErrorMessage,
  normalizeBlogSlug,
  validateBlogTranslations,
  type BlogPostStatus,
} from "@/features/blog/domain/blog-rules";
import {
  blogPostIdSchema,
  upsertBlogPostSchema,
  type BlogPostIdInput,
  type UpsertBlogPostFormInput,
  type UpsertBlogPostInput,
} from "@/features/blog/schemas/blog";
import { requireAdmin } from "@/lib/auth/policies";
import { invalidateBlogCache } from "@/lib/cache/invalidate-public";
import { createId } from "@/lib/id";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";
import { sanitizeBlogHtml } from "@/lib/sanitize/html";

async function applyBlogCoverMedia(
  postId: string,
  locale: string,
  mediaForm: FormData | undefined,
): Promise<Result<{ id: string }> | null> {
  if (!mediaForm) {
    return null;
  }

  const image = mediaForm.get("image");
  const hasImage = image instanceof File && image.size > 0;
  const removeImage = mediaForm.get("removeImage") === "1";

  if (removeImage && !hasImage) {
    await removeBlogCoverImage(postId);
    revalidateBlog(locale, postId);
    return null;
  }

  if (hasImage) {
    const mediaResult = await persistBlogCoverImage(postId, image);
    if (mediaResult.error) {
      return err("VALIDATION_ERROR", mediaResult.error);
    }
    revalidateBlog(locale, postId);
  }

  return null;
}

function buildLocaleCopy(data: UpsertBlogPostInput) {
  return {
    title: data.title.trim(),
    slug: normalizeBlogSlug(data.slug),
    excerpt: data.excerpt?.trim() || undefined,
    content: sanitizeBlogHtml(data.content),
    seoTitle: data.seoTitle?.trim() || undefined,
    seoDescription: data.seoDescription?.trim() || undefined,
  };
}

function mergeTranslations(
  existing: BlogTranslationsJson | null | undefined,
  editingLocale: Locale,
  data: UpsertBlogPostInput,
): BlogTranslationsJson {
  const copy = buildLocaleCopy(data);
  return {
    ...(existing ?? {}),
    [editingLocale]: copy,
  };
}

function parsePublishedAt(
  value: string | null | undefined,
  status: BlogPostStatus,
): Date | null {
  if (value) {
    const parsed = new Date(`${value}T12:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (status === "PUBLISHED") {
    return new Date();
  }
  return null;
}

function revalidateBlog(locale: string, postId?: string, slug?: string): void {
  revalidatePath(`/${locale}/admin/blog`);
  if (postId) {
    revalidatePath(`/${locale}/admin/blog/${postId}`);
  }
  for (const loc of locales) {
    revalidatePath(`/${loc}/blog`);
    if (slug) {
      revalidatePath(`/${loc}/blog/${slug}`);
    }
  }
  invalidateBlogCache({
    postId,
    slug,
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("blog_posts_slug_") ||
      error.message.includes("duplicate key"))
  );
}

/** Creates a blog post with sanitized content and audit. */
export async function createBlogPostAction(
  locale: string,
  raw: UpsertBlogPostFormInput,
  mediaForm?: FormData,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = upsertBlogPostSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid blog post payload.");
  }

  const editingLocale = parsed.data.editingLocale;
  const translations = mergeTranslations(null, editingLocale, parsed.data);
  const ruleError = validateBlogTranslations(translations);
  if (ruleError) {
    return err(ruleError, blogRuleErrorMessage(ruleError));
  }

  const actor = await requireAdmin(locale as Locale);
  const id = createId();
  const status = parsed.data.status;
  const publishedAt = parsePublishedAt(parsed.data.publishedAt, status);

  try {
    await withTransaction(async (tx) => {
      await tx.insert(blogPosts).values({
        id,
        authorUserId: actor.id,
        status,
        publishedAt,
        translations,
        tags: parsed.data.tags,
      });

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "blog.create",
        targetType: "blog_post",
        targetId: id,
        afterDiff: {
          title: parsed.data.title,
          slug: translations[editingLocale]?.slug,
          status,
        },
        correlationId: createId(),
      });
    });

    revalidateBlog(locale, id, translations[editingLocale]?.slug);

    const mediaError = await applyBlogCoverMedia(id, locale, mediaForm);
    if (mediaError) {
      return mediaError;
    }

    return ok({ id });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return err("SLUG_TAKEN", "That slug is already in use.");
    }
    return err("BLOG_CREATE_FAILED", "Unable to create blog post.");
  }
}

/** Updates an existing blog post. */
export async function updateBlogPostAction(
  locale: string,
  postId: string,
  raw: UpsertBlogPostFormInput,
  mediaForm?: FormData,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = upsertBlogPostSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid blog post payload.");
  }

  const actor = await requireAdmin(locale as Locale);
  const editingLocale = parsed.data.editingLocale;

  try {
    await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.id, postId), isNull(blogPosts.deletedAt)))
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      const translations = mergeTranslations(
        existing.translations,
        editingLocale,
        parsed.data,
      );
      const ruleError = validateBlogTranslations(translations);
      if (ruleError) {
        throw new Error(ruleError);
      }

      const status = parsed.data.status;
      const publishedAt =
        parsePublishedAt(parsed.data.publishedAt, status) ??
        (status === "PUBLISHED" ? existing.publishedAt : null);

      await tx
        .update(blogPosts)
        .set({
          translations,
          tags: parsed.data.tags,
          status,
          publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, postId));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "blog.update",
        targetType: "blog_post",
        targetId: postId,
        beforeDiff: {
          status: existing.status,
          slug: existing.translations.en?.slug,
        },
        afterDiff: {
          title: parsed.data.title,
          slug: translations[editingLocale]?.slug,
          status,
        },
        correlationId: createId(),
      });
    });

    revalidateBlog(locale, postId, parsed.data.slug);

    const mediaError = await applyBlogCoverMedia(postId, locale, mediaForm);
    if (mediaError) {
      return mediaError;
    }

    return ok({ id: postId });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return err("NOT_FOUND", "Blog post not found.");
    }
    if (
      error instanceof Error &&
      (error.message === "TITLE_REQUIRED" ||
        error.message === "SLUG_REQUIRED" ||
        error.message === "CONTENT_REQUIRED" ||
        error.message === "INVALID_SLUG")
    ) {
      return err(error.message, blogRuleErrorMessage(error.message));
    }
    if (isUniqueViolation(error)) {
      return err("SLUG_TAKEN", "That slug is already in use.");
    }
    return err("BLOG_UPDATE_FAILED", "Unable to update blog post.");
  }
}

/** Soft-deletes a blog post. */
export async function deleteBlogPostAction(
  locale: string,
  raw: BlogPostIdInput,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = blogPostIdSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid delete payload.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    const result = await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(blogPosts)
        .where(
          and(eq(blogPosts.id, parsed.data.postId), isNull(blogPosts.deletedAt)),
        )
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      await tx
        .update(blogPosts)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, existing.id));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "blog.delete",
        targetType: "blog_post",
        targetId: existing.id,
        beforeDiff: { status: existing.status },
        afterDiff: { deleted: true },
        correlationId: createId(),
      });

      return {
        id: existing.id,
        slug: existing.translations.en?.slug,
      };
    });

    revalidateBlog(locale, result.id, result.slug);
    return ok({ id: result.id });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return err("NOT_FOUND", "Blog post not found.");
    }
    return err("BLOG_DELETE_FAILED", "Unable to delete blog post.");
  }
}

/** Publishes a blog post. */
export async function publishBlogPostAction(
  locale: string,
  raw: BlogPostIdInput,
): Promise<Result<{ id: string; status: "PUBLISHED" }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = blogPostIdSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid publish payload.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    const result = await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(blogPosts)
        .where(
          and(eq(blogPosts.id, parsed.data.postId), isNull(blogPosts.deletedAt)),
        )
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      if (existing.status !== "DRAFT" && existing.status !== "ARCHIVED") {
        throw new Error("INVALID_STATUS");
      }

      const publishedAt = existing.publishedAt ?? new Date();

      await tx
        .update(blogPosts)
        .set({
          status: "PUBLISHED",
          publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, existing.id));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "blog.publish",
        targetType: "blog_post",
        targetId: existing.id,
        beforeDiff: { status: existing.status },
        afterDiff: {
          status: "PUBLISHED",
          publishedAt: publishedAt.toISOString(),
        },
        correlationId: createId(),
      });

      return {
        id: existing.id,
        status: "PUBLISHED" as const,
        slug: existing.translations.en?.slug,
      };
    });

    revalidateBlog(locale, result.id, result.slug);
    return ok({ id: result.id, status: result.status });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "NOT_FOUND") {
      return err("NOT_FOUND", "Blog post not found.");
    }
    if (code === "INVALID_STATUS") {
      return err(
        "INVALID_STATUS",
        "Only draft or archived posts can be published.",
      );
    }
    return err("BLOG_PUBLISH_FAILED", "Unable to publish blog post.");
  }
}

/** Archives a published blog post. */
export async function archiveBlogPostAction(
  locale: string,
  raw: BlogPostIdInput,
): Promise<Result<{ id: string; status: "ARCHIVED" }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = blogPostIdSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid archive payload.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    const result = await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(blogPosts)
        .where(
          and(eq(blogPosts.id, parsed.data.postId), isNull(blogPosts.deletedAt)),
        )
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      if (existing.status !== "PUBLISHED") {
        throw new Error("INVALID_STATUS");
      }

      await tx
        .update(blogPosts)
        .set({
          status: "ARCHIVED",
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, existing.id));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "blog.archive",
        targetType: "blog_post",
        targetId: existing.id,
        beforeDiff: { status: existing.status },
        afterDiff: { status: "ARCHIVED" },
        correlationId: createId(),
      });

      return {
        id: existing.id,
        status: "ARCHIVED" as const,
        slug: existing.translations.en?.slug,
      };
    });

    revalidateBlog(locale, result.id, result.slug);
    return ok({ id: result.id, status: result.status });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "NOT_FOUND") {
      return err("NOT_FOUND", "Blog post not found.");
    }
    if (code === "INVALID_STATUS") {
      return err("INVALID_STATUS", "Only published posts can be archived.");
    }
    return err("BLOG_ARCHIVE_FAILED", "Unable to archive blog post.");
  }
}
