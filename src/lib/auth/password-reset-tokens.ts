import { createHash, randomBytes } from "node:crypto";

import type { RedisClient } from "@/lib/redis/types";

/** Password-reset link lifetime. Align with ops if abuse patterns change. */
export const PASSWORD_RESET_TTL_SECONDS = 60 * 60;

const TOKEN_KEY_PREFIX = "auth:reset:token:";
const USER_KEY_PREFIX = "auth:reset:user:";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tokenKey(tokenHash: string): string {
  return `${TOKEN_KEY_PREFIX}${tokenHash}`;
}

function userKey(userId: string): string {
  return `${USER_KEY_PREFIX}${userId}`;
}

/**
 * Issues a high-entropy password-reset token for the user.
 * Stores only the hash in Redis with TTL; any previous token is revoked.
 */
export async function issuePasswordResetToken(
  redis: RedisClient,
  userId: string,
): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);

  const previousHash = await redis.get(userKey(userId));
  if (previousHash) {
    await redis.del(tokenKey(previousHash));
  }

  await redis.set(tokenKey(tokenHash), userId, {
    ex: PASSWORD_RESET_TTL_SECONDS,
  });
  await redis.set(userKey(userId), tokenHash, {
    ex: PASSWORD_RESET_TTL_SECONDS,
  });

  return rawToken;
}

/**
 * Atomically consumes a reset token. Returns the user id, or null if invalid/used/expired.
 */
export async function consumePasswordResetToken(
  redis: RedisClient,
  rawToken: string,
): Promise<string | null> {
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const userId = await redis.getdel(tokenKey(tokenHash));

  if (!userId) {
    return null;
  }

  await redis.del(userKey(userId));
  return userId;
}
