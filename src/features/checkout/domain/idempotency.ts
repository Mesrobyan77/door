import { createHash } from 'node:crypto';

import type { CheckoutInput } from '@/features/checkout/schemas';
import { normalizePromotionCode } from '@/features/promotions/domain/promotion-rules';

export type CheckoutFingerprintItem = {
  variantId: string;
  quantity: number;
};

/** Stable fingerprint for a checkout request, independent of cart line ordering. */
export function createCheckoutRequestFingerprint(
  input: CheckoutInput,
  items: CheckoutFingerprintItem[],
  displayCurrency: string,
): string {
  const normalizedItems = [...items]
    .map(({ variantId, quantity }) => ({ variantId, quantity }))
    .sort((first, second) => first.variantId.localeCompare(second.variantId));

  return createHash('sha256')
    .update(
      JSON.stringify({
        items: normalizedItems,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.contactEmail.toLowerCase(),
        phone: input.contactPhone,
        shippingMethod: input.shippingMethod,
        paymentMethod: input.paymentMethod,
        deliveryRuleId: input.deliveryRuleId ?? null,
        city: input.city ?? null,
        line1: input.line1 ?? null,
        line2: input.line2 ?? null,
        region: input.region ?? null,
        postalCode: input.postalCode ?? null,
        couponCode: input.couponCode ? normalizePromotionCode(input.couponCode) : null,
        locale: input.locale,
        displayCurrency,
      }),
    )
    .digest('hex');
}
