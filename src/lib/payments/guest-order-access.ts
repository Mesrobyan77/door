import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const GUEST_ORDER_ACCESS_COOKIE_PREFIX = 'ws_payment_access_';

export function createGuestOrderAccessToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashGuestOrderAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hasGuestOrderAccess(token: string | undefined, expectedHash: unknown): boolean {
  if (!token || typeof expectedHash !== 'string') return false;
  const actual = Buffer.from(hashGuestOrderAccessToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
