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

/** Saves a desktop hero image for a slide via object storage. */
export async function persistHeroImage(
  heroSlideId: string,
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
  await Promise.all(existing.map((row) => storage.deleteObject(row.objectKey)));

  const id = createId();
  const objectKey = `uploads/hero/${heroSlideId}/${id}.${extensionForImageMime(file.type)}`;
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
    role: "HERO_DESKTOP",
    sortOrder: 0,
    isPrimary: true,
    heroSlideId,
  });

  return { error: null };
}

/** Removes desktop hero media for a slide and deletes the stored object. */
export async function removeHeroImage(heroSlideId: string): Promise<void> {
  const db = getDb();
  const storage = getProviders().storage;
  const existing = await db
    .select({ objectKey: mediaAssets.objectKey })
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
  await Promise.all(existing.map((row) => storage.deleteObject(row.objectKey)));
}
