import { z } from "zod";

export const mediaPurposes = ["product", "category", "hero", "blog"] as const;

export type MediaPurpose = (typeof mediaPurposes)[number];

const mediaAssetIdSchema = z.string().uuid();

export function parseMediaAssetId(
  value: FormDataEntryValue | null,
): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const parsed = mediaAssetIdSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export type UploadedMedia = {
  mediaAssetId: string;
  secureUrl: string;
  publicId: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  format: string;
};
