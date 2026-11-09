import { describe, expect, it, vi } from 'vitest';
const target = vi.hoisted(() => ({
  value: 'postgresql://user:secret@ep-development-pooler.neon.tech/neondb',
}));
vi.mock('server-only', () => ({}));
vi.mock('@/config/env', () => ({ requireDatabaseUrl: () => target.value }));
import { getDatabaseCacheScope } from '@/lib/cache/database-scope';

describe('public database cache scope', () => {
  it('isolates branches without persisting credentials and treats pooler/direct as one target', () => {
    const development = getDatabaseCacheScope();
    expect(development).not.toContain('secret');
    expect(development).not.toContain('user');
    target.value = 'postgresql://other:password@ep-development.neon.tech/neondb';
    expect(getDatabaseCacheScope()).toBe(development);
    target.value = 'postgresql://user:secret@ep-production.neon.tech/neondb';
    expect(getDatabaseCacheScope()).not.toBe(development);
  });
});
