"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SideSheet } from "@/components/ui/SideSheet";
import {
  ADMIN_INPUT,
  ADMIN_LABEL,
} from "@/features/admin/ui/admin-form-classes";
import { CloudinaryImagePicker } from "@/features/admin/ui/CloudinaryImagePicker";
import {
  createHeroSlideAction,
  updateHeroSlideAction,
} from "@/features/hero/application/manage-hero";
import type { AdminHeroSlideListItem } from "@/features/hero/application/queries";
import type { UploadedMedia } from "@/lib/media/types";

type HeroSlideModalProps = {
  locale: string;
  open: boolean;
  onClose: () => void;
  slide?: AdminHeroSlideListItem | null;
};

export function HeroSlideModal({
  locale,
  open,
  onClose,
  slide = null,
}: HeroSlideModalProps) {
  const isEdit = slide != null;

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      ariaLabel={isEdit ? "Edit hero slide" : "Create hero slide"}
      panelClassName="w-full max-w-lg"
    >
      <HeroSlideDrawerForm
        key={slide?.id ?? "create"}
        open={open}
        locale={locale}
        onClose={onClose}
        slide={slide}
      />
    </SideSheet>
  );
}

type HeroSlideDrawerFormProps = {
  open: boolean;
  locale: string;
  onClose: () => void;
  slide: AdminHeroSlideListItem | null;
};

function HeroSlideDrawerForm({
  open,
  locale,
  onClose,
  slide,
}: HeroSlideDrawerFormProps) {
  const router = useRouter();
  const isEdit = slide != null;
  const [title, setTitle] = useState(
    slide && slide.title !== "Untitled" ? slide.title : "",
  );
  const [subtitle, setSubtitle] = useState(slide?.subtitle ?? "");
  const [uploadedImage, setUploadedImage] = useState<UploadedMedia | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setUploadedImage(null);
      setRemoveExistingImage(false);
      setError(null);
    }
  }

  return (
    <>
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit hero slide" : "Create hero slide"}
          </h2>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData();
            formData.set("title", title.trim());
            formData.set("subtitle", subtitle.trim());
            if (uploadedImage) {
              formData.set("mediaAssetId", uploadedImage.mediaAssetId);
            }
            if (removeExistingImage) {
              formData.set("removeImage", "1");
            }

            startTransition(async () => {
              setError(null);
              const result =
                isEdit && slide
                  ? await updateHeroSlideAction(locale, slide.id, formData)
                  : await createHeroSlideAction(locale, formData);

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
              <span className={ADMIN_LABEL}>Title</span>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={ADMIN_INPUT}
                disabled={isPending}
              />
            </label>

            <label className="block">
              <span className={ADMIN_LABEL}>Subtitle</span>
              <input
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                className={ADMIN_INPUT}
                disabled={isPending}
              />
            </label>

            <div>
              <CloudinaryImagePicker
                key={`${open}-${slide?.id ?? "create"}`}
                open={open}
                purpose="hero"
                initialUrl={slide?.imageUrl ?? null}
                disabled={isPending}
                label="Upload image"
                onChange={(media) => {
                  setUploadedImage(media);
                  setRemoveExistingImage(
                    !media && Boolean(isEdit && slide?.imageUrl),
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
                : isUploadingImage
                  ? "Uploading…"
                : isEdit
                  ? "Edit"
                  : "Create"}
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
    </>
  );
}
