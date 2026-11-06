"use client";

import { z } from "zod";

import type { MediaPurpose, UploadedMedia } from "@/lib/media/types";

const uploadedMediaSchema = z.object({
  mediaAssetId: z.string().uuid(),
  secure_url: z.string().url(),
  public_id: z.string().min(1),
  mimeType: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  format: z.string().min(1),
}).transform((media) => ({
  mediaAssetId: media.mediaAssetId,
  secureUrl: media.secure_url,
  publicId: media.public_id,
  mimeType: media.mimeType,
  byteSize: media.bytes,
  width: media.width,
  height: media.height,
  format: media.format,
}));

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return "Unable to upload image.";
}

export async function uploadAdminImage(
  file: File,
  purpose: MediaPurpose,
  signal?: AbortSignal,
): Promise<UploadedMedia> {
  const data = new FormData();
  data.set("file", file);
  data.set("purpose", purpose);
  const response = await fetch("/api/admin/media/upload", {
    method: "POST",
    body: data,
    credentials: "same-origin",
    signal,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const parsed = uploadedMediaSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Upload response was invalid.");
  }
  return parsed.data;
}

export async function discardPendingAdminImage(
  mediaAssetId: string,
): Promise<void> {
  const response = await fetch("/api/admin/media/upload", {
    method: "DELETE",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaAssetId }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}
