import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { mediaAssets } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { createId } from "@/lib/id";
import {
  deleteCloudinaryImage,
  uploadImageToCloudinary,
} from "@/lib/media/cloudinary";
import {
  MEDIA_IMAGE_MAX_BYTES,
  validateImageFile,
} from "@/lib/media/image-file";
import { mediaPurposes, type MediaPurpose } from "@/lib/media/types";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

const deleteSchema = z.object({ mediaAssetId: z.string().uuid() });

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function adminIsAuthorized(): Promise<boolean> {
  const user = await getCurrentUser();
  return Boolean(user && user.status === "ACTIVE" && user.role === "ADMIN");
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await adminIsAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MEDIA_IMAGE_MAX_BYTES + 64 * 1024
  ) {
    return NextResponse.json(
      { error: "Image must be 5MB or smaller." },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    logger.warn("media.upload.invalid_multipart", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Invalid upload request." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const purposeValue = formData.get("purpose");
  if (
    !(file instanceof File) ||
    typeof purposeValue !== "string" ||
    !mediaPurposes.includes(purposeValue as MediaPurpose)
  ) {
    return NextResponse.json(
      { error: "An image and valid media purpose are required." },
      { status: 400 },
    );
  }

  if (file.size > MEDIA_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be 5MB or smaller." },
      { status: 413 },
    );
  }
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  ) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, or GIF images are allowed." },
      { status: 400 },
    );
  }

  const body = Buffer.from(await file.arrayBuffer());
  const validationError = validateImageFile({
    mimeType: file.type,
    byteSize: file.size,
    buffer: body,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const purpose = purposeValue as MediaPurpose;
  const mediaAssetId = createId();
  const publicId = mediaAssetId;
  let uploadedPublicId: string | null = null;

  try {
    const uploaded = await uploadImageToCloudinary(body, publicId, purpose);
    uploadedPublicId = uploaded.public_id;
    if (!uploaded.secure_url.startsWith("https://res.cloudinary.com/")) {
      throw new Error("Cloudinary returned an unexpected secure URL.");
    }

    await getDb().insert(mediaAssets).values({
      id: mediaAssetId,
      secureUrl: uploaded.secure_url,
      cloudinaryPublicId: uploaded.public_id,
      mimeType: file.type,
      byteSize: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      uploadStatus: "PENDING",
      purpose,
    });

    return NextResponse.json(
      {
        mediaAssetId,
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id,
        mimeType: file.type,
        bytes: uploaded.bytes,
        width: uploaded.width ?? null,
        height: uploaded.height ?? null,
        format: uploaded.format,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("media.upload_failed", {
      purpose,
      message: error instanceof Error ? error.message : "unknown",
    });
    if (uploadedPublicId) {
      await deleteCloudinaryImage(uploadedPublicId).catch(
        (cleanupError: unknown) => {
          logger.error("media.upload_cleanup_failed", {
            publicId: uploadedPublicId,
            message:
              cleanupError instanceof Error
                ? cleanupError.message
                : "unknown",
          });
        },
      );
    }
    if (
      error instanceof Error &&
      error.message === "Cloudinary credentials are not configured."
    ) {
      return NextResponse.json(
        { error: "Cloudinary is not configured on the server." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Unable to upload image." },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await adminIsAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid media asset ID." },
      { status: 400 },
    );
  }

  const [asset] = await getDb()
    .select({
      id: mediaAssets.id,
      cloudinaryPublicId: mediaAssets.cloudinaryPublicId,
    })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, parsed.data.mediaAssetId),
        eq(mediaAssets.uploadStatus, "PENDING"),
      ),
    )
    .limit(1);

  if (!asset) {
    return new Response(null, { status: 204 });
  }

  try {
    if (asset.cloudinaryPublicId) {
      await deleteCloudinaryImage(asset.cloudinaryPublicId);
    }
    await getDb()
      .delete(mediaAssets)
      .where(
        and(
          eq(mediaAssets.id, asset.id),
          eq(mediaAssets.uploadStatus, "PENDING"),
        ),
      );
    return new Response(null, { status: 204 });
  } catch (error) {
    logger.error("media.pending_delete_failed", {
      mediaAssetId: asset.id,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Unable to remove the pending image." },
      { status: 502 },
    );
  }
}
