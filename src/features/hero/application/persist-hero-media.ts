import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { mediaAssets } from "@/db/schema";
import { deleteCloudinaryImage } from "@/lib/media/cloudinary";
import { attachPendingCloudinaryUpload } from "@/lib/media/persist-upload";

/** Attaches a pending Cloudinary image as a slide's desktop hero image. */
export async function persistHeroImage(
  heroSlideId: string,
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
        eq(mediaAssets.purpose, "hero"),
      ),
    )
    .limit(1);
  if (!pending) {
    return { error: "Upload an image before saving." };
  }

  const existing = await db
    .select({ cloudinaryPublicId: mediaAssets.cloudinaryPublicId })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.heroSlideId, heroSlideId),
        eq(mediaAssets.role, "HERO_DESKTOP"),
      ),
    );

  await db
    .delete(mediaAssets)
    .where(
      and(
        eq(mediaAssets.heroSlideId, heroSlideId),
        eq(mediaAssets.role, "HERO_DESKTOP"),
      ),
    );

  const attached = await attachPendingCloudinaryUpload({
    mediaAssetId,
    purpose: "hero",
    owner: { heroSlideId },
    role: "HERO_DESKTOP",
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

/** Removes desktop hero media for a slide and deletes its Cloudinary image. */
export async function removeHeroImage(heroSlideId: string): Promise<void> {
  const db = getDb();
  const existing = await db
    .select({ cloudinaryPublicId: mediaAssets.cloudinaryPublicId })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.heroSlideId, heroSlideId),
        eq(mediaAssets.role, "HERO_DESKTOP"),
      ),
    );

  await db
    .delete(mediaAssets)
    .where(
      and(
        eq(mediaAssets.heroSlideId, heroSlideId),
        eq(mediaAssets.role, "HERO_DESKTOP"),
      ),
    );
  await Promise.all(
    existing.flatMap((asset) =>
      asset.cloudinaryPublicId
        ? [deleteCloudinaryImage(asset.cloudinaryPublicId)]
        : [],
    ),
  );
}
