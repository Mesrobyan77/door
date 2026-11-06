"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { SideSheet } from "@/components/ui/SideSheet";
import {
  ADMIN_INPUT,
  ADMIN_LABEL,
} from "@/features/admin/ui/admin-form-classes";
import { CloudinaryImagePicker } from "@/features/admin/ui/CloudinaryImagePicker";
import {
  createCategoryFromDrawerAction,
  updateCategoryFromDrawerAction,
} from "@/features/categories/actions";
import { slugifyCategoryTitle } from "@/features/categories/domain/slugify";
import type { AdminCategoryListItem } from "@/features/categories/application/list-admin-categories";
import type { UploadedMedia } from "@/lib/media/types";

type AddCategoryDrawerProps = {
  locale: string;
  open: boolean;
  onClose: () => void;
  categories: AdminCategoryListItem[];
  category?: AdminCategoryListItem | null;
};

export function AddCategoryDrawer({
  locale,
  open,
  onClose,
  categories,
  category = null,
}: AddCategoryDrawerProps) {
  const router = useRouter();
  const isEdit = category != null;
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [parentId, setParentId] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [uploadedImage, setUploadedImage] = useState<UploadedMedia | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevCategory, setPrevCategory] = useState(category);

  if (open !== prevOpen || category !== prevCategory) {
    setPrevOpen(open);
    setPrevCategory(category);
    if (open) {
      if (category) {
        setTitle(category.title);
        setSlug(category.slug);
        setSlugTouched(true);
        setParentId(category.parentId ?? "");
        setStatus(category.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE");
        setUploadedImage(null);
        setRemoveExistingImage(false);
        setError(null);
      } else {
        setTitle("");
        setSlug("");
        setSlugTouched(false);
        setParentId("");
        setStatus("ACTIVE");
        setUploadedImage(null);
        setRemoveExistingImage(false);
        setError(null);
      }
    }
  }

  const displaySlug = slugTouched ? slug : slugifyCategoryTitle(title) || "---";
  const parentOptions = categories.filter((item) => item.id !== category?.id);

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      ariaLabel={isEdit ? "Edit Category" : "Add Category"}
      panelClassName="w-full max-w-lg"
    >
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEdit ? "Edit Category" : "Add Category"}
        </h2>
      </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            const nextSlug =
              slugTouched && slug.trim()
                ? slug.trim()
                : slugifyCategoryTitle(title);

            const formData = new FormData();
            formData.set("title", title.trim());
            formData.set("slug", nextSlug);
            formData.set("parentId", parentId);
            formData.set("status", status);
            if (uploadedImage) {
              formData.set("mediaAssetId", uploadedImage.mediaAssetId);
            }
            if (removeExistingImage) {
              formData.set("removeImage", "1");
            }

            startTransition(async () => {
              setError(null);
              const result =
                isEdit && category
                  ? await updateCategoryFromDrawerAction(
                      locale,
                      category.id,
                      formData,
                    )
                  : await createCategoryFromDrawerAction(locale, formData);

              if (!result.ok) {
                setError(result.error.message);
                return;
              }

              onClose();
              router.refresh();
            });
          }}
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <label className="block">
              <span className={ADMIN_LABEL}>
                Category Title <span className="text-red-600">*</span>
              </span>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter category title"
                className={ADMIN_INPUT}
                disabled={isPending}
              />
            </label>

            <label className="block">
              <span className={ADMIN_LABEL}>Slug</span>
              <input
                value={displaySlug === "---" ? "" : displaySlug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
                placeholder="---"
                className={ADMIN_INPUT}
                disabled={isPending}
              />
              <span className="mt-1 block text-xs text-gray-500">
                Generated automatically from the title and used on /products.
              </span>
            </label>

            <div>
              <span className={ADMIN_LABEL}>Parent Category</span>
              <SelectDropdown
                ariaLabel="Parent Category"
                value={parentId}
                allLabel="None (Root Category)"
                options={parentOptions.map((item) => ({
                  label: item.title,
                  value: item.id,
                }))}
                disabled={isPending}
                deferChange={false}
                className="mt-1"
                onValueChange={setParentId}
              />
            </div>

            <div>
              <span className={ADMIN_LABEL}>Status</span>
              <SelectDropdown
                ariaLabel="Status"
                value={status}
                options={[
                  { label: "Published", value: "ACTIVE" },
                  { label: "Archived", value: "ARCHIVED" },
                ]}
                disabled={isPending}
                deferChange={false}
                className="mt-1"
                onValueChange={(next) =>
                  setStatus(next as "ACTIVE" | "ARCHIVED")
                }
              />
            </div>

            <div>
              <CloudinaryImagePicker
                key={`${open}-${category?.id ?? "create"}`}
                open={open}
                purpose="category"
                initialUrl={category?.imageUrl ?? null}
                disabled={isPending}
                label="Image"
                onChange={(media) => {
                  setUploadedImage(media);
                  setRemoveExistingImage(
                    !media && Boolean(isEdit && category?.imageUrl),
                  );
                }}
                onUploadingChange={setIsUploadingImage}
              />
            </div>

            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </div>

          <div className="flex items-center gap-4 border-t border-gray-200 px-5 py-4">
            <Button
              type="submit"
              disabled={isPending || isUploadingImage || !title.trim()}
            >
              {isPending
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save"
                  : "Create Category"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="whitespace-nowrap text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </form>
    </SideSheet>
  );
}
