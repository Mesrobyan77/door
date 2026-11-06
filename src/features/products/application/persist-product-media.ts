import 'server-only';

import { and, asc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { withTransaction } from '@/db/transaction';
import { mediaAssets, productVariants } from '@/db/schema';
import { deleteCloudinaryImage } from '@/lib/media/cloudinary';
import { attachPendingCloudinaryUpload } from '@/lib/media/persist-upload';

const MAX_IMAGES = 12;

export type ProductMediaInput = {
  productId: string;
  mediaAssetIds: string[];
  primaryNewIndex: number | null;
  primaryExistingId: string | null;
  removeImageIds: string[];
};

export type ProductVariantMediaInput = {
  productId: string;
  variantId: string;
  mediaAssetIds: string[];
  orderedImageIds: string[];
  primaryNewIndex: number | null;
  primaryExistingId: string | null;
  removeImageIds: string[];
};

class PendingVariantUploadUnavailableError extends Error {
  constructor() {
    super('One or more uploaded images are no longer available.');
  }
}

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

  const remainingAfterRemove = existing.filter((row) => !input.removeImageIds.includes(row.id));
  if (remainingAfterRemove.length + input.mediaAssetIds.length > MAX_IMAGES) {
    return { error: `At most ${MAX_IMAGES} images are allowed.` };
  }

  if (new Set(input.mediaAssetIds).size !== input.mediaAssetIds.length) {
    return { error: 'Duplicate image uploads are not allowed.' };
  }

  if (input.mediaAssetIds.length > 0) {
    const pending = await db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(
        and(
          inArray(mediaAssets.id, input.mediaAssetIds),
          eq(mediaAssets.uploadStatus, 'PENDING'),
          eq(mediaAssets.purpose, 'product'),
        ),
      );
    if (pending.length !== input.mediaAssetIds.length) {
      return {
        error: 'One or more uploaded images are no longer available. Upload them again.',
      };
    }
  }

  const toRemove = existing.filter((row) => input.removeImageIds.includes(row.id));
  if (toRemove.length > 0) {
    await db.delete(mediaAssets).where(
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
      purpose: 'product',
      owner: { productId: input.productId },
      role: 'GALLERY',
      sortOrder,
      isPrimary: false,
    });
    if (!attached) {
      return {
        error: 'One or more uploaded images are no longer available. Upload them again.',
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
    .set({ isPrimary: false, role: 'GALLERY', updatedAt: new Date() })
    .where(and(eq(mediaAssets.productId, input.productId), eq(mediaAssets.isPrimary, true)));

  if (nextPrimaryId) {
    await db
      .update(mediaAssets)
      .set({
        isPrimary: true,
        role: 'PRIMARY',
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, nextPrimaryId));
  }

  await Promise.all(
    toRemove.flatMap((asset) =>
      asset.cloudinaryPublicId ? [deleteCloudinaryImage(asset.cloudinaryPublicId)] : [],
    ),
  );

  return { error: null };
}

/** Attaches pending Cloudinary images and updates one variant gallery. */
export async function persistProductVariantMedia(
  input: ProductVariantMediaInput,
): Promise<{ error: string | null }> {
  let removedImages: Array<{ cloudinaryPublicId: string | null }> = [];
  try {
    const result = await withTransaction(async (tx) => {
      const [variant] = await tx
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.id, input.variantId),
            eq(productVariants.productId, input.productId),
          ),
        )
        .for('update')
        .limit(1);
      if (!variant) {
        return {
          error: 'Variant does not belong to this product.',
          removedImages: [],
        };
      }

      const existing = await tx
        .select({
          id: mediaAssets.id,
          cloudinaryPublicId: mediaAssets.cloudinaryPublicId,
        })
        .from(mediaAssets)
        .where(eq(mediaAssets.variantId, input.variantId))
        .orderBy(asc(mediaAssets.sortOrder))
        .for('update');

      if (
        new Set(input.removeImageIds).size !== input.removeImageIds.length ||
        input.removeImageIds.some((id) => !existing.some((image) => image.id === id))
      ) {
        return {
          error: 'One or more images do not belong to this variant.',
          removedImages: [],
        };
      }
      if (new Set(input.mediaAssetIds).size !== input.mediaAssetIds.length) {
        return {
          error: 'Duplicate image uploads are not allowed.',
          removedImages: [],
        };
      }

      const remaining = existing.filter((image) => !input.removeImageIds.includes(image.id));
      if (remaining.length + input.mediaAssetIds.length > MAX_IMAGES) {
        return {
          error: `At most ${MAX_IMAGES} images are allowed.`,
          removedImages: [],
        };
      }

      const expectedOrderedIds = [...remaining.map((image) => image.id), ...input.mediaAssetIds];
      if (
        new Set(input.orderedImageIds).size !== input.orderedImageIds.length ||
        input.orderedImageIds.length !== expectedOrderedIds.length ||
        expectedOrderedIds.some((id) => !input.orderedImageIds.includes(id))
      ) {
        return { error: 'The variant image order is invalid.', removedImages: [] };
      }

      if (input.mediaAssetIds.length > 0) {
        const pending = await tx
          .select({ id: mediaAssets.id })
          .from(mediaAssets)
          .where(
            and(
              inArray(mediaAssets.id, input.mediaAssetIds),
              eq(mediaAssets.uploadStatus, 'PENDING'),
              eq(mediaAssets.purpose, 'product'),
            ),
          )
          .for('update');
        if (pending.length !== input.mediaAssetIds.length) {
          return {
            error: 'One or more uploaded images are no longer available. Upload them again.',
            removedImages: [],
          };
        }
      }

      const attachedIdsByPendingId = new Map<string, string>();
      for (let index = 0; index < input.mediaAssetIds.length; index += 1) {
        const mediaAssetId = input.mediaAssetIds[index];
        if (!mediaAssetId) continue;
        const attached = await attachPendingCloudinaryUpload({
          mediaAssetId,
          purpose: 'product',
          owner: { variantId: input.variantId },
          role: 'GALLERY',
          sortOrder: existing.length + index,
          isPrimary: false,
          tx,
        });
        if (!attached) {
          throw new PendingVariantUploadUnavailableError();
        }
        attachedIdsByPendingId.set(mediaAssetId, attached.id);
      }

      const toRemove = existing.filter((image) => input.removeImageIds.includes(image.id));
      if (toRemove.length > 0) {
        await tx.delete(mediaAssets).where(
          and(
            eq(mediaAssets.variantId, input.variantId),
            inArray(
              mediaAssets.id,
              toRemove.map((image) => image.id),
            ),
          ),
        );
      }

      const idByOrderKey = new Map<string, string>([
        ...remaining.map((image) => [image.id, image.id] as const),
        ...attachedIdsByPendingId,
      ]);
      const orderedIds = input.orderedImageIds.flatMap((id) => {
        const resolvedId = idByOrderKey.get(id);
        return resolvedId ? [resolvedId] : [];
      });
      for (let index = 0; index < orderedIds.length; index += 1) {
        const id = orderedIds[index];
        if (id) {
          await tx
            .update(mediaAssets)
            .set({ sortOrder: index, updatedAt: new Date() })
            .where(and(eq(mediaAssets.id, id), eq(mediaAssets.variantId, input.variantId)));
        }
      }

      const createdIds = input.mediaAssetIds.flatMap((id) => {
        const attachedId = attachedIdsByPendingId.get(id);
        return attachedId ? [attachedId] : [];
      });
      const nextPrimaryId =
        input.primaryNewIndex != null &&
        input.primaryNewIndex >= 0 &&
        input.primaryNewIndex < createdIds.length
          ? (createdIds[input.primaryNewIndex] ?? null)
          : input.primaryExistingId &&
              remaining.some((image) => image.id === input.primaryExistingId)
            ? input.primaryExistingId
            : (orderedIds[0] ?? null);

      await tx
        .update(mediaAssets)
        .set({ isPrimary: false, role: 'GALLERY', updatedAt: new Date() })
        .where(and(eq(mediaAssets.variantId, input.variantId), eq(mediaAssets.isPrimary, true)));

      if (nextPrimaryId) {
        await tx
          .update(mediaAssets)
          .set({ isPrimary: true, role: 'PRIMARY', updatedAt: new Date() })
          .where(
            and(eq(mediaAssets.id, nextPrimaryId), eq(mediaAssets.variantId, input.variantId)),
          );
      }

      return { error: null, removedImages: toRemove };
    });

    if (result.error) {
      return { error: result.error };
    }
    removedImages = result.removedImages;
  } catch (error) {
    if (error instanceof PendingVariantUploadUnavailableError) {
      return {
        error: 'One or more uploaded images are no longer available. Upload them again.',
      };
    }
    throw error;
  }

  await Promise.all(
    removedImages.flatMap((image) =>
      image.cloudinaryPublicId ? [deleteCloudinaryImage(image.cloudinaryPublicId)] : [],
    ),
  );

  return { error: null };
}

/** Loads Cloudinary gallery URLs for admin product editing. */
export async function loadProductImagesForAdmin(
  productIds: string[],
): Promise<Map<string, { id: string; url: string; isPrimary: boolean }[]>> {
  const map = new Map<string, { id: string; url: string; isPrimary: boolean }[]>();
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
    .where(and(inArray(mediaAssets.productId, productIds), eq(mediaAssets.uploadStatus, 'READY')))
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

/** Loads variant-owned Cloudinary gallery URLs for admin product editing. */
export async function loadVariantImagesForAdmin(
  variantIds: string[],
): Promise<Map<string, { id: string; url: string; isPrimary: boolean }[]>> {
  const map = new Map<string, { id: string; url: string; isPrimary: boolean }[]>();
  if (variantIds.length === 0) return map;

  const rows = await getDb()
    .select({
      id: mediaAssets.id,
      variantId: mediaAssets.variantId,
      secureUrl: mediaAssets.secureUrl,
      isPrimary: mediaAssets.isPrimary,
    })
    .from(mediaAssets)
    .where(and(inArray(mediaAssets.variantId, variantIds), eq(mediaAssets.uploadStatus, 'READY')))
    .orderBy(asc(mediaAssets.sortOrder));

  for (const row of rows) {
    if (!row.variantId || !row.secureUrl) continue;
    const list = map.get(row.variantId) ?? [];
    list.push({
      id: row.id,
      url: row.secureUrl,
      isPrimary: row.isPrimary,
    });
    map.set(row.variantId, list);
  }

  return map;
}
