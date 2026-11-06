"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ConfirmDialog,
  deleteConfirmDescription,
} from "@/components/ui/ConfirmDialog";
import {
  ADMIN_PAGE_TITLE,
} from "@/features/admin/ui/admin-form-classes";
import { AdminSearchInput } from "@/features/admin/ui/AdminSearchInput";
import { ADMIN_BADGE } from "@/features/admin/ui/status-badge";
import { deleteBlogPostAction } from "@/features/blog/application/manage-blog";
import type { AdminBlogListItem } from "@/features/blog/application/queries";
import { BlogPostDrawer } from "@/features/blog/ui/BlogPostDrawer";

type AdminBlogViewProps = {
  locale: string;
  posts: AdminBlogListItem[];
};

function statusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "PUBLISHED") return "bg-green-100 text-green-800";
  if (normalized === "DRAFT") return "bg-yellow-100 text-yellow-800";
  if (normalized === "ARCHIVED") return "bg-gray-100 text-gray-800";
  return "bg-gray-100 text-gray-800";
}

function statusLabel(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "PUBLISHED") return "Published";
  if (normalized === "DRAFT") return "Draft";
  if (normalized === "ARCHIVED") return "Archived";
  return status;
}

export function AdminBlogView({ locale, posts }: AdminBlogViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<AdminBlogListItem | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return posts;
    return posts.filter((post) => {
      const haystack = `${post.title} ${post.slug} ${post.excerpt}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [posts, query]);

  function openCreate(): void {
    setEditingPost(null);
    setDrawerOpen(true);
  }

  function openEdit(post: AdminBlogListItem): void {
    setEditingPost(post);
    setDrawerOpen(true);
  }

  function closeDrawer(): void {
    setDrawerOpen(false);
    setEditingPost(null);
  }

  function requestDelete(postId: string, postTitle: string): void {
    setPendingDelete({ id: postId, title: postTitle });
  }

  function confirmDelete(): void {
    if (!pendingDelete) return;
    const postId = pendingDelete.id;

    startTransition(async () => {
      setError(null);
      const result = await deleteBlogPostAction(locale, { postId });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setPendingDelete(null);
      router.refresh();
    });
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className={ADMIN_PAGE_TITLE}>Blog</h1>
        <Button
          type="button"
          size="sm"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Post
        </Button>
      </div>

      <AdminSearchInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by title or slug"
        wrapperClassName="mb-4"
        aria-label="Search blog posts"
      />

      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="rounded-xl p-8">
            <p className="text-center text-sm text-gray-600">
              {posts.length === 0
                ? "No blog posts yet."
                : "No posts match this search."}
            </p>
          </Card>
        ) : (
          filtered.map((post) => (
            <Card
              key={post.id}
              className="rounded-xl border border-gray-200 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {post.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.coverUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-medium text-white/70">
                        Blog
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {post.title}
                    </p>
                    {post.excerpt ? (
                      <p className="mt-0.5 line-clamp-1 text-sm text-gray-600">
                        {post.excerpt}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-gray-500">
                      {post.path}
                      {post.publishedAt ? ` · ${post.publishedAt}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                  <span
                    className={`${ADMIN_BADGE} ${statusBadgeClass(post.status)}`}
                  >
                    {statusLabel(post.status)}
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => openEdit(post)}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                    aria-label={`Edit ${post.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => requestDelete(post.id, post.title)}
                    className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    aria-label={`Delete ${post.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {drawerOpen ? (
        <BlogPostDrawer
          key={editingPost?.id ?? "new"}
          locale={locale}
          open
          onClose={closeDrawer}
          post={editingPost}
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete"
        description={
          pendingDelete
            ? deleteConfirmDescription("post", pendingDelete.title)
            : ""
        }
        isPending={isPending}
        onClose={() => {
          if (!isPending) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
