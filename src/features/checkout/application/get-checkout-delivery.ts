import "server-only";

import {
  listCheckoutDeliveryOptions,
  type CheckoutDeliveryOption,
} from "@/features/delivery/application/queries";

export type { CheckoutDeliveryOption };

/** Active delivery locations for the checkout dropdown. */
export async function getCheckoutDeliveryOptions(): Promise<
  CheckoutDeliveryOption[]
> {
  return listCheckoutDeliveryOptions();
}
