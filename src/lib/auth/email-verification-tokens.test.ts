import { describe, expect, it, vi } from 'vitest';

import {
  EMAIL_VERIFICATION_TTL_SECONDS,
  consumeEmailVerificationToken,
  getEmailVerificationToken,
  issueEmailVerificationToken,
} from '@/lib/auth/email-verification-tokens';
import {
  consumePasswordResetToken,
  issuePasswordResetToken,
} from '@/lib/auth/password-reset-tokens';
import { createMemoryRedisAdapter } from '@/lib/redis/memory-adapter';

describe('email verification tokens', () => {
  it('accepts a valid, purpose-bound token exactly once', async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const token = await issueEmailVerificationToken(redis, 'user-1');
    await expect(getEmailVerificationToken(redis, token)).resolves.toEqual({
      purpose: 'email_verification',
      userId: 'user-1',
    });
    await expect(consumeEmailVerificationToken(redis, token, 'user-1')).resolves.toBe(true);
    await expect(consumeEmailVerificationToken(redis, token, 'user-1')).resolves.toBe(false);
  });

  it('rejects an expired token', async () => {
    vi.useFakeTimers();
    try {
      const redis = createMemoryRedisAdapter().getClient();
      const token = await issueEmailVerificationToken(redis, 'user-1');
      vi.advanceTimersByTime((EMAIL_VERIFICATION_TTL_SECONDS + 1) * 1000);
      await expect(getEmailVerificationToken(redis, token)).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not consume a token under the wrong purpose', async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const resetToken = await issuePasswordResetToken(redis, 'user-1');
    await expect(getEmailVerificationToken(redis, resetToken)).resolves.toBeNull();
    await expect(consumePasswordResetToken(redis, resetToken)).resolves.toBe('user-1');
  });

  it('does not consume a valid token before its user binding matches', async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const token = await issueEmailVerificationToken(redis, 'user-1');
    await expect(consumeEmailVerificationToken(redis, token, 'user-2')).resolves.toBe(false);
    await expect(consumeEmailVerificationToken(redis, token, 'user-1')).resolves.toBe(true);
  });

  it('allows only one concurrent consumer', async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const token = await issueEmailVerificationToken(redis, 'user-1');
    const results = await Promise.all(
      Array.from({ length: 8 }, () => consumeEmailVerificationToken(redis, token, 'user-1')),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
