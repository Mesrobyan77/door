import 'server-only';

import type { UploadApiResponse } from 'cloudinary';

import {
  deleteCloudinaryImageProvider,
  uploadImageToCloudinaryProvider,
} from '@/lib/media/cloudinary-provider';
import type { MediaPurpose } from '@/lib/media/types';

export function uploadImageToCloudinary(
  body: Buffer,
  publicId: string,
  purpose: MediaPurpose,
): Promise<UploadApiResponse> {
  return uploadImageToCloudinaryProvider(body, publicId, purpose);
}

export function deleteCloudinaryImage(publicId: string): Promise<void> {
  return deleteCloudinaryImageProvider(publicId);
}
