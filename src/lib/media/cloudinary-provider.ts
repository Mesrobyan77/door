import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';

import type { MediaPurpose } from '@/lib/media/types';
import { logger } from '@/lib/observability/logger';

function configureCloudinary(): void {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are not configured.');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function uploadImageToCloudinaryProvider(
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
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
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
          reject(new Error('Cloudinary returned no upload result.'));
          return;
        }
        resolve(result);
      },
    );

    stream.end(body);
  });
}

export function deleteCloudinaryImageProvider(publicId: string): Promise<void> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: 'image', invalidate: true },
      (error, result) => {
        if (error) {
          logger.error('cloudinary.image_delete_failed', {
            publicId,
            message: error.message,
          });
          reject(error);
          return;
        }
        if (result?.result !== 'ok' && result?.result !== 'not found') {
          const deletionError = new Error(`Cloudinary deletion failed: ${result?.result}.`);
          logger.error('cloudinary.image_delete_failed', {
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

export async function getCloudinaryImageProvider(publicId: string): Promise<UploadApiResponse | null> {
  configureCloudinary();
  try {
    return await cloudinary.api.resource(publicId, { resource_type: 'image' }) as unknown as UploadApiResponse;
  } catch (error) {
    if (typeof error === 'object' && error && 'error' in error) {
      const detail = (error as { error?: { http_code?: number } }).error;
      if (detail?.http_code === 404) return null;
    }
    throw error;
  }
}
