import { describe, expect, it } from 'vitest';

import {
  acquireVerificationResend,
  resendEmailVerification,
} from '@/lib/auth/email-verification-delivery';
import { createMemoryRedisAdapter } from '@/lib/redis/memory-adapter';

describe('email verification delivery', () => {
  it('limits successful resend requests', async () => {
    const redis = createMemoryRedisAdapter().getClient();
    await expect(acquireVerificationResend(redis, 'user-1')).resolves.toBe(true);
    await expect(acquireVerificationResend(redis, 'user-1')).resolves.toBe(false);
  });

  it('can retry after a delivery failure when its resend lock is released', async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const failingEmail = {
      name: 'failing',
      send: async () => {
        throw new Error('provider down');
      },
    };
    await expect(
      resendEmailVerification({
        redis,
        email: failingEmail,
        userId: 'user-1',
        recipient: 'user@example.test',
        locale: 'en',
        appUrl: 'https://white-shop.test',
      }),
    ).rejects.toThrow('provider down');
    const delivered: string[] = [];
    await expect(
      resendEmailVerification({
        redis,
        email: {
          name: 'working',
          send: async (message) => {
            delivered.push(message.to);
            return { id: 'mail-1' };
          },
        },
        userId: 'user-1',
        recipient: 'user@example.test',
        locale: 'en',
        appUrl: 'https://white-shop.test',
      }),
    ).resolves.toBe('sent');
    expect(delivered).toEqual(['user@example.test']);
  });
});
