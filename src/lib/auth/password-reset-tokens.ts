import { createHash, randomBytes } from 'node:crypto';
import type { RedisClient } from '@/lib/redis/types';

export const PASSWORD_RESET_TTL_SECONDS = 60 * 60;
export const PASSWORD_RESET_CLAIM_TTL_SECONDS = 2 * 60;
export const PASSWORD_RESET_PURPOSE = 'password_reset' as const;
const TOKEN_KEY_PREFIX = 'auth:reset:token:';
const USER_KEY_PREFIX = 'auth:reset:user:';
const CLAIM_KEY_PREFIX = 'auth:reset:claim:';

type PasswordResetRecord = {
  purpose: typeof PASSWORD_RESET_PURPOSE;
  userId: string;
  passwordVersion: string;
  expiresAt: number;
};
export type PasswordResetClaim = PasswordResetRecord & { tokenHash: string; claimId: string };
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const tokenKey = (hash: string) => `${TOKEN_KEY_PREFIX}${hash}`;
const userKey = (id: string) => `${USER_KEY_PREFIX}${id}`;
const claimKey = (hash: string) => `${CLAIM_KEY_PREFIX}${hash}`;

function parseRecord(value: string | null): PasswordResetRecord | null {
  if (!value) return null;
  try {
    const record = JSON.parse(value) as Partial<PasswordResetRecord>;
    return record.purpose === PASSWORD_RESET_PURPOSE &&
      typeof record.userId === 'string' &&
      typeof record.passwordVersion === 'string' &&
      typeof record.expiresAt === 'number' &&
      record.expiresAt > Date.now()
      ? (record as PasswordResetRecord)
      : null;
  } catch {
    return null;
  }
}

export async function issuePasswordResetToken(
  redis: RedisClient,
  userId: string,
  passwordUpdatedAt: Date,
): Promise<string> {
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const previousHash = await redis.get(userKey(userId));
  if (previousHash) await redis.del(tokenKey(previousHash));
  const record: PasswordResetRecord = {
    purpose: PASSWORD_RESET_PURPOSE,
    userId,
    passwordVersion: passwordUpdatedAt.toISOString(),
    expiresAt: Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000,
  };
  await redis.set(tokenKey(tokenHash), JSON.stringify(record), { ex: PASSWORD_RESET_TTL_SECONDS });
  await redis.set(userKey(userId), tokenHash, { ex: PASSWORD_RESET_TTL_SECONDS });
  return rawToken;
}

export async function claimPasswordResetToken(
  redis: RedisClient,
  rawToken: string,
): Promise<PasswordResetClaim | null> {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const first = parseRecord(await redis.get(tokenKey(tokenHash)));
  if (!first || (await redis.get(userKey(first.userId))) !== tokenHash) return null;
  const claimId = randomBytes(24).toString('base64url');
  if (
    !(await redis.set(claimKey(tokenHash), claimId, {
      ex: PASSWORD_RESET_CLAIM_TTL_SECONDS,
      nx: true,
    }))
  )
    return null;
  const confirmed = parseRecord(await redis.get(tokenKey(tokenHash)));
  if (
    !confirmed ||
    confirmed.userId !== first.userId ||
    (await redis.get(userKey(first.userId))) !== tokenHash
  ) {
    await redis.compareAndDelete(claimKey(tokenHash), claimId);
    return null;
  }
  return { ...confirmed, tokenHash, claimId };
}

export async function releasePasswordResetClaim(
  redis: RedisClient,
  claim: PasswordResetClaim,
): Promise<void> {
  await redis.compareAndDelete(claimKey(claim.tokenHash), claim.claimId);
}

/** Best-effort after DB commit; passwordVersion makes a stale record unusable. */
export async function finalizePasswordResetClaim(
  redis: RedisClient,
  claim: PasswordResetClaim,
): Promise<void> {
  await redis.getdel(tokenKey(claim.tokenHash));
  await redis.compareAndDelete(userKey(claim.userId), claim.tokenHash);
  await redis.compareAndDelete(claimKey(claim.tokenHash), claim.claimId);
}
