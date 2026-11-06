import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { mediaAssets } from "@/db/schema";
import { deleteCloudinaryImage } from "@/lib/media/cloudinary";
import { attachPendingCloudinaryUpload } from "@/lib/media/persist-upload";

/** Attaches a pending Cloudinary image as a blog post's cover. */
export async function persistBlogCoverImage(
  blogPostId: string,
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
        eq(mediaAssets.purpose, "blog"),
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
        eq(mediaAssets.blogPostId, blogPostId),
        eq(mediaAssets.role, "COVER"),
      ),
    );

  await db
    .delete(mediaAssets)
    .where(
      and(
        eq(mediaAssets.blogPostId, blogPostId),
        eq(mediaAssets.role, "COVER"),
      ),
    );

  const attached = await attachPendingCloudinaryUpload({
    mediaAssetId,
    purpose: "blog",
    owner: { blogPostId },
    role: "COVER",
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

/** Removes cover media for a blog post and its Cloudinary image. */
export async function removeBlogCoverImage(blogPostId: string): Promise<void> {
  const db = getDb();
  const existing = await db
    .select({ cloudinaryPublicId: mediaAssets.cloudinaryPublicId })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.blogPostId, blogPostId),
        eq(mediaAssets.role, "COVER"),
      ),
    );

  await db
    .delete(mediaAssets)
    .where(
      and(
        eq(mediaAssets.blogPostId, blogPostId),
        eq(mediaAssets.role, "COVER"),
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
