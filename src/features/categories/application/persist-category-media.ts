import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { mediaAssets } from "@/db/schema";
import { deleteCloudinaryImage } from "@/lib/media/cloudinary";
import { attachPendingCloudinaryUpload } from "@/lib/media/persist-upload";

/** Attaches a pending Cloudinary image as a category's primary image. */
export async function persistCategoryImage(
  categoryId: string,
  mediaAssetId: string,
): Promise<{ error: string | null }> {
  const db = getDb();
  const [pending] = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, mediaAssetId),
        eq(mediaAssets.uploadStatus, "PENDING"),
        eq(mediaAssets.purpose, "category"),
      ),
    )
    .limit(1);
  if (!pending) {
    return { error: "Upload an image before saving." };
  }

  const existing = await db
    .select({ cloudinaryPublicId: mediaAssets.cloudinaryPublicId })
    .from(mediaAssets)
    .where(eq(mediaAssets.categoryId, categoryId));

  await db.delete(mediaAssets).where(eq(mediaAssets.categoryId, categoryId));

  const attached = await attachPendingCloudinaryUpload({
    mediaAssetId,
    purpose: "category",
    owner: { categoryId },
    role: "PRIMARY",
    sortOrder: 0,
    isPrimary: true,
  });
  if (!attached) {
    return { error: "The uploaded image is no longer available. Upload it again." };
  }

  await Promise.all(
    existing.flatMap((asset) =>
      asset.cloudinaryPublicId
        ? [deleteCloudinaryImage(asset.cloudinaryPublicId)]
        : [],
    ),
  );
  return { error: null };
}

/** Removes all media rows for a category and its Cloudinary images. */
export async function removeCategoryImage(categoryId: string): Promise<void> {
  const db = getDb();
  const existing = await db
    .select({ cloudinaryPublicId: mediaAssets.cloudinaryPublicId })
    .from(mediaAssets)
    .where(eq(mediaAssets.categoryId, categoryId));

  await db.delete(mediaAssets).where(eq(mediaAssets.categoryId, categoryId));
  await Promise.all(
    existing.flatMap((asset) =>
      asset.cloudinaryPublicId
        ? [deleteCloudinaryImage(asset.cloudinaryPublicId)]
        : [],
    ),
  );
}
