"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { ADMIN_LABEL } from "@/features/admin/ui/admin-form-classes";
import {
  discardPendingAdminImage,
  uploadAdminImage,
} from "@/lib/media/client-upload";

export type ProductDraftImage = {
  key: string;
  previewUrl: string;
  isPrimary: boolean;
  /** Existing DB media id when editing. */
  existingId?: string;
  /** Pending Cloudinary media row created by the upload endpoint. */
  mediaAssetId?: string;
  isUploading?: boolean;
};

type ProductDrawerImagesProps = {
  images: ProductDraftImage[];
  disabled: boolean;
  open: boolean;
  onChange: (images: ProductDraftImage[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  onError: (message: string) => void;
};

export function ProductDrawerImages({
  images,
  disabled,
  open,
  onChange,
  onUploadingChange,
  onError,
}: ProductDrawerImagesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  const openRef = useRef(open);
  const isUploading = images.some((image) => image.isUploading);

  useEffect(() => {
    imagesRef.current = images;
    openRef.current = open;
  }, [images, open]);

  useEffect(() => {
    if (open) return;
    for (const image of imagesRef.current) {
      if (image.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(image.previewUrl);
      }
    }
    const pendingIds = imagesRef.current.flatMap((image) =>
      image.mediaAssetId ? [image.mediaAssetId] : [],
    );
    for (const mediaAssetId of pendingIds) {
      void discardPendingAdminImage(mediaAssetId).catch((error: unknown) => {
        console.error("Unable to discard pending Cloudinary image.", error);
      });
    }
    onUploadingChange(false);
  }, [open, onUploadingChange]);

  function setPrimary(key: string): void {
    onChange(
      images.map((image) => ({
        ...image,
        isPrimary: image.key === key,
      })),
    );
  }

  async function removeImage(key: string): Promise<void> {
    const removed = images.find((image) => image.key === key);
    if (removed?.mediaAssetId) {
      try {
        await discardPendingAdminImage(removed.mediaAssetId);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Unable to remove the pending image.",
        );
        return;
      }
    }

    const next = images.filter((image) => image.key !== key);
    const first = next[0];
    if (first && !next.some((image) => image.isPrimary)) {
      next[0] = { ...first, isPrimary: true };
    }
    if (removed?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    onChange(next);
  }

  async function handleFiles(fileList: FileList | null): Promise<void> {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    if (images.length + files.length > 12) {
      onError("At most 12 images are allowed.");
      return;
    }
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
    if (files.some((file) => !allowedTypes.has(file.type))) {
      onError("Only JPEG, PNG, WebP, or GIF images are allowed.");
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      onError("Each image must be 5MB or smaller.");
      return;
    }

    let next = [...images];
    const jobs = files.map((file) => {
      const key = `new-${crypto.randomUUID()}`;
      const previewUrl = URL.createObjectURL(file);
      next.push({
        key,
        previewUrl,
        isPrimary: false,
        isUploading: true,
      });
      return { file, key, previewUrl };
    });
    if (!next.some((image) => image.isPrimary) && next[0]) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
    onUploadingChange(true);
    onError("");

    for (const job of jobs) {
      if (!openRef.current) {
        break;
      }
      try {
        const uploaded = await uploadAdminImage(job.file, "product");
        if (!openRef.current) {
          await discardPendingAdminImage(uploaded.mediaAssetId);
          URL.revokeObjectURL(job.previewUrl);
          next = next.filter((image) => image.key !== job.key);
          onChange(next);
          continue;
        }
        next = next.map((image) =>
          image.key === job.key
            ? {
                ...image,
                previewUrl: uploaded.secureUrl,
                mediaAssetId: uploaded.mediaAssetId,
                isUploading: false,
              }
            : image,
        );
        URL.revokeObjectURL(job.previewUrl);
        onChange(next);
      } catch (error) {
        URL.revokeObjectURL(job.previewUrl);
        if (!openRef.current) {
          break;
        }
        next = next.filter((image) => image.key !== job.key);
        const first = next[0];
        if (first && !next.some((image) => image.isPrimary)) {
          next[0] = { ...first, isPrimary: true };
        }
        onChange(next);
        onError(
          error instanceof Error ? error.message : "Unable to upload image.",
        );
      }
    }

    onUploadingChange(false);
  }

  return (
    <div>
      <span className={ADMIN_LABEL}>Main Product Image</span>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center rounded-xl border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
        >
          {isUploading ? "Uploading…" : "+ Upload Image"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          disabled={disabled || isUploading}
          onChange={(event) => {
            const files = event.target.files;
            event.target.value = "";
            void handleFiles(files);
          }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Upload one or more images, then mark the main image with the checkbox.
      </p>

      {images.length > 0 ? (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <li
              key={image.key}
              className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src={image.previewUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                  unoptimized={image.previewUrl.startsWith("blob:")}
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-2 py-2">
                {image.isUploading ? (
                  <span className="text-xs text-gray-600" role="status">
                    Uploading…
                  </span>
                ) : (
                  <label className="flex items-center gap-1.5 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={image.isPrimary}
                      disabled={disabled || isUploading}
                      onChange={() => setPrimary(image.key)}
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                    Main
                  </label>
                )}
                <button
                  type="button"
                  disabled={disabled || isUploading}
                  onClick={() => void removeImage(image.key)}
                  className="rounded p-1 text-gray-500 hover:bg-white hover:text-red-600"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
