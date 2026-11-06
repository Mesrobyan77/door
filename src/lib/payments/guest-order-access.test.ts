import { describe, expect, it } from 'vitest';
import {
  createGuestOrderAccessToken,
  hasGuestOrderAccess,
  hashGuestOrderAccessToken,
} from '@/lib/payments/guest-order-access';

describe('guest payment access', () => {
  it('accepts only the opaque credential stored for that order', () => {
    const orderOne = createGuestOrderAccessToken();
    const orderTwo = createGuestOrderAccessToken();
    expect(hasGuestOrderAccess(orderOne, hashGuestOrderAccessToken(orderOne))).toBe(true);
    expect(hasGuestOrderAccess(undefined, hashGuestOrderAccessToken(orderOne))).toBe(false);
    expect(hasGuestOrderAccess('invalid', hashGuestOrderAccessToken(orderOne))).toBe(false);
    expect(hasGuestOrderAccess(orderTwo, hashGuestOrderAccessToken(orderOne))).toBe(false);
  });
});
