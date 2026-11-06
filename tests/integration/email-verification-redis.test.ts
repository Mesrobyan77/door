import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  consumeEmailVerificationToken,
  issueEmailVerificationToken,
} from '@/lib/auth/email-verification-tokens';
import { createUpstashRedisAdapter } from '@/lib/redis/upstash-adapter';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const integration = url && token ? describe : describe.skip;

integration('Upstash email-verification token lifecycle', () => {
  it('atomically permits one consumer on the configured isolated Redis instance', async () => {
    const redis = createUpstashRedisAdapter({ url: url!, token: token! }).getClient();
    const userId = crypto.randomUUID();
    const rawToken = await issueEmailVerificationToken(redis, userId);
    const results = await Promise.all(
      Array.from({ length: 4 }, () => consumeEmailVerificationToken(redis, rawToken, userId)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
