import { createHash, randomBytes } from 'node:crypto';

import type { RedisClient } from '@/lib/redis/types';

/** Email-verification links remain valid for 24 hours. */
export const EMAIL_VERIFICATION_TTL_SECONDS = 24 * 60 * 60;
export const EMAIL_VERIFICATION_PURPOSE = 'email_verification' as const;

const TOKEN_KEY_PREFIX = 'auth:verify:token:';
const USER_KEY_PREFIX = 'auth:verify:user:';

type VerificationRecord = {
  purpose: typeof EMAIL_VERIFICATION_PURPOSE;
  userId: string;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function tokenKey(tokenHash: string): string {
  return `${TOKEN_KEY_PREFIX}${tokenHash}`;
}

function userKey(userId: string): string {
  return `${USER_KEY_PREFIX}${userId}`;
}

function parseRecord(value: string | null): VerificationRecord | null {
  if (!value) return null;
  try {
    const record: unknown = JSON.parse(value);
    if (
      typeof record === 'object' &&
      record !== null &&
      (record as { purpose?: unknown }).purpose === EMAIL_VERIFICATION_PURPOSE &&
      typeof (record as { userId?: unknown }).userId === 'string'
    ) {
      return record as VerificationRecord;
    }
  } catch {
    // A malformed ephemeral record is invalid and must never be trusted.
  }
  return null;
}

/** Issues a random token while persisting only its hash and a purpose-bound record. */
export async function issueEmailVerificationToken(
  redis: RedisClient,
  userId: string,
): Promise<string> {
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const previousHash = await redis.get(userKey(userId));

  if (previousHash) await redis.del(tokenKey(previousHash));

  const record: VerificationRecord = {
    purpose: EMAIL_VERIFICATION_PURPOSE,
    userId,
  };
  await redis.set(tokenKey(tokenHash), JSON.stringify(record), {
    ex: EMAIL_VERIFICATION_TTL_SECONDS,
  });
  await redis.set(userKey(userId), tokenHash, { ex: EMAIL_VERIFICATION_TTL_SECONDS });
  return rawToken;
}

/** Reads a token without consuming it so its purpose and user binding can be validated first. */
export async function getEmailVerificationToken(
  redis: RedisClient,
  rawToken: string,
): Promise<VerificationRecord | null> {
  if (!rawToken) return null;
  return parseRecord(await redis.get(tokenKey(hashToken(rawToken))));
}

/**
 * Atomically consumes a previously validated verification token.
 * The expected user binding is checked before and after GETDEL; therefore a
 * wrong-purpose or wrong-user token is never destructively consumed.
 */
export async function consumeEmailVerificationToken(
  redis: RedisClient,
  rawToken: string,
  expectedUserId: string,
): Promise<boolean> {
  const tokenHash = hashToken(rawToken);
  const key = tokenKey(tokenHash);
  const preview = parseRecord(await redis.get(key));
  if (!preview || preview.userId !== expectedUserId) return false;

  const consumed = parseRecord(await redis.getdel(key));
  if (!consumed || consumed.userId !== expectedUserId) return false;

  await redis.del(userKey(expectedUserId));
  return true;
}
