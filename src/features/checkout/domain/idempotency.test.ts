import { describe, expect, it } from 'vitest';

import { createCheckoutRequestFingerprint } from '@/features/checkout/domain/idempotency';
import type { CheckoutInput } from '@/features/checkout/schemas';

const checkout: CheckoutInput = {
  firstName: 'Test',
  lastName: 'Customer',
  contactEmail: 'test@example.local',
  contactPhone: '+37400000000',
  shippingMethod: 'pickup',
  paymentMethod: 'cash_on_delivery',
  idempotencyKey: 'test-key-12345678',
  locale: 'hy',
};

const items = [
  { variantId: 'variant-b', quantity: 1 },
  { variantId: 'variant-a', quantity: 2 },
];

describe('createCheckoutRequestFingerprint', () => {
  it('is stable for equivalent cart line order and coupon casing', () => {
    const first = createCheckoutRequestFingerprint(
      { ...checkout, couponCode: 'SAVE10' },
      items,
      'AMD',
    );
    const second = createCheckoutRequestFingerprint(
      { ...checkout, couponCode: ' save10 ' },
      [...items].reverse(),
      'AMD',
    );

    expect(first).toBe(second);
  });

  it('changes when the purchased lines or checkout details change', () => {
    const fingerprint = createCheckoutRequestFingerprint(checkout, items, 'AMD');

    expect(
      createCheckoutRequestFingerprint(checkout, [{ variantId: 'variant-a', quantity: 1 }], 'AMD'),
    ).not.toBe(fingerprint);
    expect(
      createCheckoutRequestFingerprint({ ...checkout, city: 'Yerevan' }, items, 'AMD'),
    ).not.toBe(fingerprint);
    expect(createCheckoutRequestFingerprint(checkout, items, 'USD')).not.toBe(fingerprint);
  });
});
