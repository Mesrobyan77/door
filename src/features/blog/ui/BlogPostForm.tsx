"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXTAREA,
} from "@/features/admin/ui/admin-form-classes";
import { ADMIN_BADGE } from "@/features/admin/ui/status-badge";
import {
  archiveBlogPostAction,
  createBlogPostAction,
  publishBlogPostAction,
  updateBlogPostAction,
} from "@/features/blog/application/manage-blog";
import type { BlogPostStatus } from "@/features/blog/domain/blog-rules";
import {
  canArchiveBlogPost,
  canPublishBlogPost,
} from "@/features/blog/domain/blog-rules";
import type { UpsertBlogPostFormInput } from "@/features/blog/schemas/blog";
import { isLocale } from "@/lib/i18n/config";

type BlogPostFormProps = {
  locale: string;
  mode: "create" | "edit";
  postId?: string;
  status?: BlogPostStatus;
  defaults?: Partial<UpsertBlogPostFormInput>;
};

function blogStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "PUBLISHED") return "bg-green-100 text-green-800";
  if (normalized === "DRAFT") return "bg-yellow-100 text-yellow-800";
  if (normalized === "ARCHIVED") return "bg-gray-100 text-gray-800";
  return "bg-gray-100 text-gray-800";
}

export function BlogPostForm({
  locale,
  mode,
  postId,
  status,
  defaults,
}: BlogPostFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tagsDefault = defaults?.tags ?? "";

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Card className="p-6">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const payload: UpsertBlogPostFormInput = {
              editingLocale: isLocale(locale) ? locale : "en",
              title: String(formData.get("title") ?? ""),
              slug: String(formData.get("slug") ?? ""),
              excerpt: String(formData.get("excerpt") ?? "") || undefined,
              content: String(formData.get("content") ?? ""),
              seoTitle: String(formData.get("seoTitle") ?? "") || undefined,
              seoDescription:
                String(formData.get("seoDescription") ?? "") || undefined,
              tags: String(formData.get("tags") ?? "") || undefined,
              status: status ?? "DRAFT",
            };

            startTransition(async () => {
              setError(null);
              const result =
                mode === "edit" && postId
                  ? await updateBlogPostAction(locale, postId, payload)
                  : await createBlogPostAction(locale, payload);

              if (!result.ok) {
                setError(result.error.message);
                return;
              }

              router.push(`/${locale}/admin/blog/${result.value.id}`);
              router.refresh();
            });
          }}
        >
          <h2 className={ADMIN_SECTION_TITLE}>
            {mode === "edit" ? "Edit blog post" : "Create blog post"}
          </h2>

          {status ? (
            <p className="text-sm text-gray-600">
              Status:{" "}
              <span
                className={`${ADMIN_BADGE} ${blogStatusBadgeClass(status)}`}
              >
                {status}
              </span>
            </p>
          ) : null}

          <label>
            <span className={ADMIN_LABEL}>Title</span>
            <input
              name="title"
              required
              defaultValue={defaults?.title ?? ""}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>Slug</span>
            <input
              name="slug"
              required
              defaultValue={defaults?.slug ?? ""}
              placeholder="my-post-title"
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>Excerpt</span>
            <textarea
              name="excerpt"
              rows={2}
              defaultValue={defaults?.excerpt ?? ""}
              className={ADMIN_TEXTAREA}
              disabled={isPending}
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>Content (HTML)</span>
            <textarea
              name="content"
              required
              rows={10}
              defaultValue={defaults?.content ?? ""}
              className={`${ADMIN_TEXTAREA} font-mono`}
              disabled={isPending}
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>SEO title</span>
            <input
              name="seoTitle"
              defaultValue={defaults?.seoTitle ?? ""}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>SEO description</span>
            <textarea
              name="seoDescription"
              rows={2}
              defaultValue={defaults?.seoDescription ?? ""}
              className={ADMIN_TEXTAREA}
              disabled={isPending}
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>Tags (comma-separated)</span>
            <input
              name="tags"
              defaultValue={tagsDefault}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Create"}
          </Button>
        </form>
      </Card>

      {mode === "edit" && postId && status ? (
        <div className="flex flex-wrap gap-2">
          {canPublishBlogPost(status) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  setError(null);
                  const result = await publishBlogPostAction(locale, {
                    postId,
                  });
                  if (!result.ok) {
                    setError(result.error.message);
                    return;
                  }
                  router.refresh();
                });
              }}
            >
              Publish
            </Button>
          ) : null}
          {canArchiveBlogPost(status) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  setError(null);
                  const result = await archiveBlogPostAction(locale, {
                    postId,
                  });
                  if (!result.ok) {
                    setError(result.error.message);
                    return;
                  }
                  router.refresh();
                });
              }}
            >
              Archive
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
