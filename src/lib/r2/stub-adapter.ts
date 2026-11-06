import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ObjectStorageAdapter } from "@/lib/r2/types";

/**
 * Local filesystem adapter for development when R2 credentials are absent.
 * Writes under `public/` so relative `/uploads/...` URLs work in Next.js.
 */
export function createStubObjectStorageAdapter(
  publicBaseUrl = "",
): ObjectStorageAdapter {
  return {
    name: "stub-r2",
    async createPresignedUpload({ objectKey }) {
      const base = publicBaseUrl.replace(/\/$/, "");
      return {
        objectKey,
        uploadUrl: `${base}/upload/${objectKey}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };
    },
    async putObject({ objectKey, body }) {
      const absolute = path.join(process.cwd(), "public", objectKey);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, body);
    },
    buildPublicUrl(objectKey) {
      const key = objectKey.replace(/^\//, "");
      const base = publicBaseUrl.replace(/\/$/, "");
      if (!base) {
        return `/${key}`;
      }
      return `${base}/${key}`;
    },
    async deleteObject(objectKey) {
      const absolute = path.join(process.cwd(), "public", objectKey);
      try {
        await unlink(absolute);
      } catch {
        // Best-effort cleanup for local stub storage.
      }
    },
  };
}
