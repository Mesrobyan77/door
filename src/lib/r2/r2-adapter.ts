import "server-only";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { logger } from "@/lib/observability/logger";
import type { ObjectStorageAdapter } from "@/lib/r2/types";

export type R2AdapterConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
  /** Defaults to `https://{accountId}.r2.cloudflarestorage.com`. */
  endpoint?: string;
};

const PRESIGN_TTL_SECONDS = 15 * 60;

/** Cloudflare R2 adapter (S3-compatible API). */
export function createR2ObjectStorageAdapter(
  config: R2AdapterConfig,
): ObjectStorageAdapter {
  const endpoint =
    config.endpoint?.replace(/\/$/, "") ??
    `https://${config.accountId}.r2.cloudflarestorage.com`;
  const publicBaseUrl = config.publicBaseUrl.replace(/\/$/, "");

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    name: "cloudflare-r2",
    async createPresignedUpload({ objectKey, contentType }) {
      const command = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
        ContentType: contentType,
      });
      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: PRESIGN_TTL_SECONDS,
      });
      return {
        objectKey,
        uploadUrl,
        expiresAt: new Date(Date.now() + PRESIGN_TTL_SECONDS * 1000),
      };
    },
    async putObject({ objectKey, body, contentType }) {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: config.bucketName,
            Key: objectKey,
            Body: body,
            ContentType: contentType,
          }),
        );
      } catch (error) {
        logger.error("r2.put_object_failed", {
          objectKey,
          message: error instanceof Error ? error.message : "unknown",
        });
        throw error;
      }
    },
    buildPublicUrl(objectKey) {
      const key = objectKey.replace(/^\//, "");
      return `${publicBaseUrl}/${key}`;
    },
    async deleteObject(objectKey) {
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: config.bucketName,
            Key: objectKey,
          }),
        );
      } catch (error) {
        logger.warn("r2.delete_object_failed", {
          objectKey,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    },
  };
}
