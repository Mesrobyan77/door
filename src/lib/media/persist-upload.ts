import 'server-only';

import { and, eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import type { DbTransaction } from '@/db/transaction';
import { mediaAssets } from '@/db/schema';
import type { MediaPurpose } from '@/lib/media/types';

type MediaOwner = {
  productId?: string;
  variantId?: string;
  categoryId?: string;
  heroSlideId?: string;
  blogPostId?: string;
};

export async function attachPendingCloudinaryUpload(input: {
  mediaAssetId: string;
  purpose: MediaPurpose;
  owner: MediaOwner;
  role: (typeof mediaAssets.$inferInsert)['role'];
  sortOrder: number;
  isPrimary: boolean;
  tx?: DbTransaction;
}): Promise<{ id: string } | null> {
  const db = input.tx ?? getDb();
  const [asset] = await db
    .update(mediaAssets)
    .set({
      ...input.owner,
      role: input.role,
      sortOrder: input.sortOrder,
      isPrimary: input.isPrimary,
      purpose: null,
      uploadStatus: 'READY',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mediaAssets.id, input.mediaAssetId),
        eq(mediaAssets.uploadStatus, 'PENDING'),
        eq(mediaAssets.purpose, input.purpose),
      ),
    )
    .returning();

  return asset ? { id: asset.id } : null;
}
