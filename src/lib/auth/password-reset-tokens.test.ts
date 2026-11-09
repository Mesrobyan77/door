import { describe, expect, it } from 'vitest';
import {
  claimPasswordResetToken,
  finalizePasswordResetClaim,
  issuePasswordResetToken,
  releasePasswordResetClaim,
} from '@/lib/auth/password-reset-tokens';
import { issueEmailVerificationToken } from '@/lib/auth/email-verification-tokens';
import { createMemoryRedisAdapter } from '@/lib/redis/memory-adapter';

describe('password reset tokens', () => {
  const version = new Date('2026-01-01T00:00:00.000Z');
  it('claims and finalizes a purpose-bound token once', async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const token = await issuePasswordResetToken(redis, 'user-1', version);
    const claim = await claimPasswordResetToken(redis, token);
    expect(claim).toMatchObject({ userId: 'user-1', passwordVersion: version.toISOString() });
    await finalizePasswordResetClaim(redis, claim!);
    await expect(claimPasswordResetToken(redis, token)).resolves.toBeNull();
  });
  it('allows only one concurrent claim and permits retry after release', async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const token = await issuePasswordResetToken(redis, 'user-1', version);
    const claims = await Promise.all(
      Array.from({ length: 8 }, () => claimPasswordResetToken(redis, token)),
    );
    expect(claims.filter(Boolean)).toHaveLength(1);
    await releasePasswordResetClaim(redis, claims.find(Boolean)!);
    await expect(claimPasswordResetToken(redis, token)).resolves.toMatchObject({
      userId: 'user-1',
    });
  });
  it('rejects malformed, superseded, and wrong-purpose tokens without consuming valid tokens', async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const first = await issuePasswordResetToken(redis, 'user-1', version);
    const second = await issuePasswordResetToken(redis, 'user-1', version);
    const verification = await issueEmailVerificationToken(redis, 'user-1');
    await expect(claimPasswordResetToken(redis, 'bad')).resolves.toBeNull();
    await expect(claimPasswordResetToken(redis, first)).resolves.toBeNull();
    await expect(claimPasswordResetToken(redis, verification)).resolves.toBeNull();
    await expect(claimPasswordResetToken(redis, second)).resolves.toMatchObject({
      userId: 'user-1',
    });
  });
});
