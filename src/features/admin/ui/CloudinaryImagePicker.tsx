"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import {
  discardPendingAdminImage,
  uploadAdminImage,
} from "@/lib/media/client-upload";
import type { MediaPurpose, UploadedMedia } from "@/lib/media/types";

type CloudinaryImagePickerProps = {
  open: boolean;
  purpose: MediaPurpose;
  initialUrl: string | null;
  disabled: boolean;
  label: string;
  onChange: (media: UploadedMedia | null) => void;
  onUploadingChange: (uploading: boolean) => void;
};

export function CloudinaryImagePicker({
  open,
  purpose,
  initialUrl,
  disabled,
  label,
  onChange,
  onUploadingChange,
}: CloudinaryImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingIdRef = useRef<string | null>(null);
  const openRef = useRef(open);
  const onChangeRef = useRef(onChange);
  const onUploadingChangeRef = useRef(onUploadingChange);
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const previewUrlRef = useRef(previewUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    openRef.current = open;
    onChangeRef.current = onChange;
    onUploadingChangeRef.current = onUploadingChange;
  }, [open, onChange, onUploadingChange]);

  useEffect(
    () => () => {
      openRef.current = false;
      if (previewUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const pendingId = pendingIdRef.current;
      if (pendingId) {
        void discardPendingAdminImage(pendingId).catch((discardError: unknown) => {
          console.error("Unable to discard pending Cloudinary image.", discardError);
        });
      }
      onUploadingChangeRef.current(false);
    },
    [],
  );

  function updatePreviewUrl(url: string | null): void {
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return;

    const previousPendingId = pendingIdRef.current;
    const preview = URL.createObjectURL(file);
    const previousUrl = previewUrl;
    updatePreviewUrl(preview);
    setIsUploading(true);
    onUploadingChangeRef.current(true);
    setError(null);

    let uploadedMediaAssetId: string | null = null;
    try {
      const uploaded = await uploadAdminImage(file, purpose);
      uploadedMediaAssetId = uploaded.mediaAssetId;
      if (!openRef.current) {
        await discardPendingAdminImage(uploaded.mediaAssetId);
        return;
      }
      if (previousPendingId) {
        await discardPendingAdminImage(previousPendingId);
      }
      pendingIdRef.current = uploaded.mediaAssetId;
      updatePreviewUrl(uploaded.secureUrl);
      onChangeRef.current(uploaded);
      if (previousUrl?.startsWith("blob:")) URL.revokeObjectURL(previousUrl);
    } catch (uploadError) {
      if (uploadedMediaAssetId) {
        await discardPendingAdminImage(uploadedMediaAssetId).catch(
          (discardError: unknown) => {
            console.error(
              "Unable to discard failed Cloudinary image.",
              discardError,
            );
          },
        );
      }
      URL.revokeObjectURL(preview);
      if (openRef.current) {
        updatePreviewUrl(previousUrl);
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Unable to upload image.",
        );
      }
    } finally {
      setIsUploading(false);
      onUploadingChangeRef.current(false);
    }
  }

  async function removeImage(): Promise<void> {
    const pendingId = pendingIdRef.current;
    pendingIdRef.current = null;
    if (pendingId) {
      try {
        await discardPendingAdminImage(pendingId);
      } catch (discardError) {
        setError(
          discardError instanceof Error
            ? discardError.message
            : "Unable to remove the pending image.",
        );
        return;
      }
    }
    updatePreviewUrl(null);
    setError(null);
    onChangeRef.current(null);
  }

  return (
    <div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center rounded-xl border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
        >
          {isUploading
            ? "Uploading…"
            : previewUrl
              ? "Change image"
              : "+ Upload image"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={disabled || isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void handleFile(file);
          }}
        />
        {previewUrl ? (
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => void removeImage()}
            className="text-sm font-medium text-gray-600 hover:text-red-600 disabled:opacity-50"
          >
            Remove
          </button>
        ) : null}
      </div>
      {previewUrl ? (
        <Image
          src={previewUrl}
          alt=""
          width={112}
          height={112}
          className="mt-3 h-28 w-28 rounded-xl border border-gray-200 object-cover"
          unoptimized={previewUrl.startsWith("blob:")}
        />
      ) : null}
      {isUploading ? (
        <p className="mt-1 text-xs text-gray-500" role="status">
          Uploading image securely to Cloudinary…
        </p>
      ) : null}
      {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
