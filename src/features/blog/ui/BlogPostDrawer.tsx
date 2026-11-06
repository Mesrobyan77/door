"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { SideSheet } from "@/components/ui/SideSheet";
import {
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_TEXTAREA,
} from "@/features/admin/ui/admin-form-classes";
import {
  createBlogPostAction,
  updateBlogPostAction,
} from "@/features/blog/application/manage-blog";
import type { AdminBlogListItem } from "@/features/blog/application/queries";
import {
  normalizeBlogSlug,
  type BlogPostStatus,
  type BlogTranslations,
} from "@/features/blog/domain/blog-rules";
import { localeLabels, locales, type Locale } from "@/lib/i18n/config";

type LocaleDraft = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  slugTouched: boolean;
};

type BlogPostDrawerProps = {
  locale: string;
  open: boolean;
  onClose: () => void;
  post?: AdminBlogListItem | null;
};

function emptyDraft(): LocaleDraft {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    slugTouched: false,
  };
}

function draftsFromTranslations(
  translations: BlogTranslations | undefined,
): Record<Locale, LocaleDraft> {
  const next = {
    hy: emptyDraft(),
    en: emptyDraft(),
    ru: emptyDraft(),
  } satisfies Record<Locale, LocaleDraft>;

  for (const loc of locales) {
    const copy = translations?.[loc];
    if (!copy) continue;
    next[loc] = {
      title: copy.title,
      slug: copy.slug,
      excerpt: copy.excerpt ?? "",
      content: copy.content,
      slugTouched: true,
    };
  }

  return next;
}

function resolvedSlug(draft: LocaleDraft): string {
  if (draft.slugTouched && draft.slug.trim()) {
    return normalizeBlogSlug(draft.slug);
  }
  const fromTitle = normalizeBlogSlug(draft.title);
  return fromTitle || `post-${Date.now().toString(36)}`;
}

export function BlogPostDrawer({
  locale,
  open,
  onClose,
  post = null,
}: BlogPostDrawerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = post != null;
  const [activeLocale, setActiveLocale] = useState<Locale>(() => {
    if (!post) return "en";
    return (
      (locales.find((loc) => post.translations[loc]?.title) as
        | Locale
        | undefined) ?? "en"
    );
  });
  const [drafts, setDrafts] = useState<Record<Locale, LocaleDraft>>(() =>
    draftsFromTranslations(post?.translations),
  );
  const [status, setStatus] = useState<BlogPostStatus>(
    () => post?.status ?? "DRAFT",
  );
  const [publishedAt, setPublishedAt] = useState(
    () => post?.publishedAt ?? "",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    () => post?.coverUrl ?? null,
  );
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevPost, setPrevPost] = useState(post);

  if (open !== prevOpen || post !== prevPost) {
    setPrevOpen(open);
    setPrevPost(post);
    if (open) {
      if (post) {
        setActiveLocale(
          (locales.find((loc) => post.translations[loc]?.title) as
            | Locale
            | undefined) ?? "en",
        );
        setDrafts(draftsFromTranslations(post.translations));
        setStatus(post.status);
        setPublishedAt(post.publishedAt ?? "");
        setImageFile(null);
        setImagePreview(post.coverUrl ?? null);
        setRemoveExistingImage(false);
        setError(null);
      } else {
        setActiveLocale("en");
        setDrafts({
          hy: emptyDraft(),
          en: emptyDraft(),
          ru: emptyDraft(),
        });
        setStatus("DRAFT");
        setPublishedAt("");
        setImageFile(null);
        setImagePreview(null);
        setRemoveExistingImage(false);
        setError(null);
      }
    }
  }

  const draft = drafts[activeLocale];

  function updateDraft(patch: Partial<LocaleDraft>): void {
    setDrafts((current) => ({
      ...current,
      [activeLocale]: { ...current[activeLocale], ...patch },
    }));
  }

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      ariaLabel={isEdit ? "Edit blog post" : "Add blog post"}
      panelClassName="w-full max-w-lg"
    >
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit blog post" : "Add blog post"}
          </h2>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            const current = drafts[activeLocale];
            const slug = resolvedSlug(current);
            if (!current.title.trim() || !current.content.trim()) {
              setError("Title and full text are required.");
              return;
            }

            startTransition(async () => {
              setError(null);
              const payload = {
                editingLocale: activeLocale,
                title: current.title,
                slug,
                excerpt: current.excerpt || undefined,
                content: current.content,
                status,
                publishedAt: publishedAt || null,
                tags: post?.tags.join(", ") ?? "",
              };
              const mediaForm = new FormData();
              if (imageFile) {
                mediaForm.set("image", imageFile);
              }
              if (removeExistingImage) {
                mediaForm.set("removeImage", "1");
              }

              const result =
                isEdit && post
                  ? await updateBlogPostAction(
                      locale,
                      post.id,
                      payload,
                      mediaForm,
                    )
                  : await createBlogPostAction(locale, payload, mediaForm);

              if (!result.ok) {
                setError(result.error.message);
                return;
              }

              onClose();
              router.refresh();
            });
          }}
        >
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Translations
              </p>
              <div className="flex flex-wrap gap-2">
                {locales.map((loc) => {
                  const selected = loc === activeLocale;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setActiveLocale(loc)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                        selected
                          ? "bg-gray-900 text-white"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {localeLabels[loc]}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className={ADMIN_LABEL}>
                Title <span className="text-red-600">*</span>
              </span>
              <input
                required
                value={draft.title}
                onChange={(event) =>
                  updateDraft({ title: event.target.value })
                }
                className={ADMIN_INPUT}
                disabled={isPending}
              />
            </label>

            <label className="block">
              <span className={ADMIN_LABEL}>Short excerpt</span>
              <input
                value={draft.excerpt}
                onChange={(event) =>
                  updateDraft({ excerpt: event.target.value })
                }
                className={ADMIN_INPUT}
                disabled={isPending}
              />
            </label>

            <label className="block">
              <span className={ADMIN_LABEL}>
                Full text <span className="text-red-600">*</span>
              </span>
              <textarea
                required
                rows={8}
                value={draft.content}
                onChange={(event) =>
                  updateDraft({ content: event.target.value })
                }
                className={ADMIN_TEXTAREA}
                disabled={isPending}
              />
              <span className="mt-1 block text-xs text-gray-500">
                Plain text or HTML. Double line breaks create new paragraphs.
              </span>
            </label>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Common
              </p>
              <div className="space-y-4">
                <label className="block">
                  <span className={ADMIN_LABEL}>Publication date</span>
                  <input
                    type="date"
                    value={publishedAt}
                    onChange={(event) => setPublishedAt(event.target.value)}
                    className={ADMIN_INPUT}
                    disabled={isPending}
                  />
                  <span className="mt-1 block text-xs text-gray-500">
                    Shown on the post. Leave empty to use today when publishing.
                  </span>
                </label>
                <div>
                  <span className={ADMIN_LABEL}>Status</span>
                  <SelectDropdown
                    ariaLabel="Status"
                    value={status}
                    options={[
                      { label: "Draft", value: "DRAFT" },
                      { label: "Published", value: "PUBLISHED" },
                      { label: "Archived", value: "ARCHIVED" },
                    ]}
                    disabled={isPending}
                    deferChange={false}
                    className="mt-1"
                    onValueChange={(next) =>
                      setStatus(next as BlogPostStatus)
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <span className={ADMIN_LABEL}>Cover image</span>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center rounded-xl border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
                >
                  {imagePreview ? "Change image" : "+ Upload image"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    event.target.value = "";
                    setImagePreview((current) => {
                      if (current?.startsWith("blob:")) {
                        URL.revokeObjectURL(current);
                      }
                      return file ? URL.createObjectURL(file) : null;
                    });
                    setImageFile(file);
                    setRemoveExistingImage(false);
                  }}
                />
                {imagePreview ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview((current) => {
                        if (current?.startsWith("blob:")) {
                          URL.revokeObjectURL(current);
                        }
                        return null;
                      });
                      if (isEdit && post?.coverUrl) {
                        setRemoveExistingImage(true);
                      }
                    }}
                    className="text-sm font-medium text-gray-600 hover:text-red-600"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob/admin preview
                <img
                  src={imagePreview}
                  alt=""
                  className="mt-3 h-28 w-28 rounded-xl border border-gray-200 object-cover"
                />
              ) : null}
              <p className="mt-1 text-xs text-gray-500">
                JPEG, PNG, WebP, or GIF. Max 5MB.
              </p>
            </div>

            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </div>

          <div className="border-t border-gray-200 px-5 py-4">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
    </SideSheet>
  );
}
