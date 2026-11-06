import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { mediaAssets } from "@/db/schema";
import { deleteCloudinaryImage } from "@/lib/media/cloudinary";
import { attachPendingCloudinaryUpload } from "@/lib/media/persist-upload";

const MAX_IMAGES = 12;

export type ProductMediaInput = {
  productId: string;
  mediaAssetIds: string[];
  primaryNewIndex: number | null;
  primaryExistingId: string | null;
  removeImageIds: string[];
};

/** Attaches pending Cloudinary images and updates the product gallery. */
export async function persistProductMedia(
  input: ProductMediaInput,
): Promise<{ error: string | null }> {
  const db = getDb();
  const existing = await db
    .select({
      id: mediaAssets.id,
      cloudinaryPublicId: mediaAssets.cloudinaryPublicId,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.productId, input.productId))
    .orderBy(asc(mediaAssets.sortOrder));

  const remainingAfterRemove = existing.filter(
    (row) => !input.removeImageIds.includes(row.id),
  );
  if (remainingAfterRemove.length + input.mediaAssetIds.length > MAX_IMAGES) {
    return { error: `At most ${MAX_IMAGES} images are allowed.` };
  }

  if (new Set(input.mediaAssetIds).size !== input.mediaAssetIds.length) {
    return { error: "Duplicate image uploads are not allowed." };
  }

  if (input.mediaAssetIds.length > 0) {
    const pending = await db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(
        and(
          inArray(mediaAssets.id, input.mediaAssetIds),
          eq(mediaAssets.uploadStatus, "PENDING"),
          eq(mediaAssets.purpose, "product"),
        ),
      );
    if (pending.length !== input.mediaAssetIds.length) {
      return {
        error: "One or more uploaded images are no longer available. Upload them again.",
      };
    }
  }

  const toRemove = existing.filter((row) =>
    input.removeImageIds.includes(row.id),
  );
  if (toRemove.length > 0) {
    await db
      .delete(mediaAssets)
      .where(
        inArray(
          mediaAssets.id,
          toRemove.map((row) => row.id),
        ),
      );
  }

  let sortOrder = remainingAfterRemove.length;
  const createdIds: string[] = [];
  for (const mediaAssetId of input.mediaAssetIds) {
    const attached = await attachPendingCloudinaryUpload({
      mediaAssetId,
      purpose: "product",
      owner: { productId: input.productId },
      role: "GALLERY",
      sortOrder,
      isPrimary: false,
    });
    if (!attached) {
      return {
        error: "One or more uploaded images are no longer available. Upload them again.",
      };
    }
    createdIds.push(attached.id);
    sortOrder += 1;
  }

  const nextPrimaryId =
    input.primaryNewIndex != null &&
    input.primaryNewIndex >= 0 &&
    input.primaryNewIndex < createdIds.length
      ? (createdIds[input.primaryNewIndex] ?? null)
      : input.primaryExistingId &&
          remainingAfterRemove.some((row) => row.id === input.primaryExistingId)
        ? input.primaryExistingId
        : (remainingAfterRemove[0]?.id ?? createdIds[0] ?? null);

  await db
    .update(mediaAssets)
    .set({ isPrimary: false, role: "GALLERY", updatedAt: new Date() })
    .where(
      and(
        eq(mediaAssets.productId, input.productId),
        eq(mediaAssets.isPrimary, true),
      ),
    );

  if (nextPrimaryId) {
    await db
      .update(mediaAssets)
      .set({
        isPrimary: true,
        role: "PRIMARY",
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, nextPrimaryId));
  }

  await Promise.all(
    toRemove.flatMap((asset) =>
      asset.cloudinaryPublicId
        ? [deleteCloudinaryImage(asset.cloudinaryPublicId)]
        : [],
    ),
  );

  return { error: null };
}

/** Loads Cloudinary gallery URLs for admin product editing. */
export async function loadProductImagesForAdmin(
  productIds: string[],
): Promise<Map<string, { id: string; url: string; isPrimary: boolean }[]>> {
  const map = new Map<
    string,
    { id: string; url: string; isPrimary: boolean }[]
  >();
  if (productIds.length === 0) return map;

  const rows = await getDb()
    .select({
      id: mediaAssets.id,
      productId: mediaAssets.productId,
      secureUrl: mediaAssets.secureUrl,
      isPrimary: mediaAssets.isPrimary,
      sortOrder: mediaAssets.sortOrder,
    })
    .from(mediaAssets)
    .where(
      and(
        inArray(mediaAssets.productId, productIds),
        eq(mediaAssets.uploadStatus, "READY"),
      ),
    )
    .orderBy(asc(mediaAssets.sortOrder));

  for (const row of rows) {
    if (!row.productId || !row.secureUrl) continue;
    const list = map.get(row.productId) ?? [];
    list.push({
      id: row.id,
      url: row.secureUrl,
      isPrimary: row.isPrimary,
    });
    map.set(row.productId, list);
  }

  return map;
}
