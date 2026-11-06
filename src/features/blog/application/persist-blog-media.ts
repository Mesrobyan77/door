import "server-only";

import { and, eq } from "drizzle-orm";

import { getProviders } from "@/config/providers";
import { getDb } from "@/db/client";
import { mediaAssets } from "@/db/schema";
import { createId } from "@/lib/id";
import {
  extensionForImageMime,
  validateImageFile,
} from "@/lib/media/image-file";

/** Saves a cover image for a blog post via object storage. */
export async function persistBlogCoverImage(
  blogPostId: string,
  file: File,
): Promise<{ error: string | null }> {
  const validationError = validateImageFile(file);
  if (validationError) {
    return { error: validationError };
  }

  const db = getDb();
  const storage = getProviders().storage;
  const existing = await db
    .select({ objectKey: mediaAssets.objectKey })
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
  await Promise.all(existing.map((row) => storage.deleteObject(row.objectKey)));

  const id = createId();
  const objectKey = `uploads/blog/${blogPostId}/${id}.${extensionForImageMime(file.type)}`;
  await storage.putObject({
    objectKey,
    body: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
  });

  await db.insert(mediaAssets).values({
    id,
    objectKey,
    mimeType: file.type,
    byteSize: file.size,
    uploadStatus: "READY",
    role: "COVER",
    sortOrder: 0,
    isPrimary: true,
    blogPostId,
  });

  return { error: null };
}

/** Removes cover media for a blog post and deletes the stored object. */
export async function removeBlogCoverImage(blogPostId: string): Promise<void> {
  const db = getDb();
  const storage = getProviders().storage;
  const existing = await db
    .select({ objectKey: mediaAssets.objectKey })
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
  await Promise.all(existing.map((row) => storage.deleteObject(row.objectKey)));
}
