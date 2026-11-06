import "server-only";

import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

import { getEnv } from "@/config/env";
import type { MediaPurpose } from "@/lib/media/types";
import { logger } from "@/lib/observability/logger";

function configureCloudinary(): void {
  const env = getEnv();
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary credentials are not configured.");
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function uploadImageToCloudinary(
  body: Buffer,
  publicId: string,
  purpose: MediaPurpose,
): Promise<UploadApiResponse> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `door/${purpose}`,
        public_id: publicId,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        overwrite: false,
        unique_filename: false,
        use_filename: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary returned no upload result."));
          return;
        }
        resolve(result);
      },
    );

    stream.end(body);
  });
}

export function deleteCloudinaryImage(publicId: string): Promise<void> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: "image", invalidate: true },
      (error, result) => {
        if (error) {
          logger.error("cloudinary.image_delete_failed", {
            publicId,
            message: error.message,
          });
          reject(error);
          return;
        }
        if (result?.result !== "ok" && result?.result !== "not found") {
          const deletionError = new Error(
            `Cloudinary deletion failed: ${result?.result}.`,
          );
          logger.error("cloudinary.image_delete_failed", {
            publicId,
            message: deletionError.message,
          });
          reject(deletionError);
          return;
        }
        resolve();
      },
    );
  });
}
