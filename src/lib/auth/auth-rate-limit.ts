import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import type { RedisClient } from '@/lib/redis/types';

export type AuthRateLimitPolicy = { limit: number; windowSeconds: number; failOpen: boolean };
export const AUTH_RATE_LIMIT_POLICIES = {
  loginAccount: { limit: 5, windowSeconds: 900, failOpen: true },
  loginOrigin: { limit: 20, windowSeconds: 900, failOpen: true },
  registerIdentity: { limit: 3, windowSeconds: 3600, failOpen: false },
  registerOrigin: { limit: 10, windowSeconds: 3600, failOpen: false },
  recoveryIdentity: { limit: 5, windowSeconds: 900, failOpen: false },
  recoveryOrigin: { limit: 20, windowSeconds: 900, failOpen: false },
  verificationOrigin: { limit: 10, windowSeconds: 900, failOpen: false },
} as const satisfies Record<string, AuthRateLimitPolicy>;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export async function getTrustedRequestOrigin(): Promise<string> {
  const values = await headers();
  const vercel = process.env.VERCEL ? values.get('x-vercel-forwarded-for') : null;
  if (vercel) return vercel.split(',')[0]!.trim();
  const cloudflare = values.get('cf-ray') ? values.get('cf-connecting-ip') : null;
  return cloudflare?.trim() || 'untrusted-origin';
}

export async function enforceAuthRateLimit(
  redis: RedisClient,
  bucket: string,
  subject: string,
  policy: AuthRateLimitPolicy,
): Promise<'allowed' | 'limited' | 'unavailable'> {
  try {
    const count = await redis.incrementWithExpiry(
      `auth:limit:${bucket}:${digest(subject)}`,
      policy.windowSeconds,
    );
    return count <= policy.limit ? 'allowed' : 'limited';
  } catch {
    return policy.failOpen ? 'allowed' : 'unavailable';
  }
}
