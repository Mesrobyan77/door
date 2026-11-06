import "server-only";

import { getProviders } from "@/config/providers";

/** Resolves a stored object key to a public CDN/base URL. */
export function mediaPublicUrl(objectKey: string): string {
  return getProviders().storage.buildPublicUrl(objectKey);
}
