import 'server-only';
import { requireDatabaseUrl } from '@/config/env';

/** Isolate persisted Next read models when local Neon branches change. No credentials in keys. */
export function getDatabaseCacheScope(): string {
  const target = new URL(requireDatabaseUrl());
  return `catalog-v2:${target.hostname.replace('-pooler.', '.')}:${target.pathname}`;
}
