"use server";

import { getCartDrawerView } from "@/features/cart/get-cart-drawer-view";
import type { CartDrawerView } from "@/features/cart/get-cart-drawer-view";
import type { Locale } from "@/lib/i18n/config";
import type { Currency } from "@/lib/money/currency";

/** Loads full cart-drawer payload on demand (opened drawer only). */
export async function loadCartDrawerViewAction(
  locale: Locale,
  currency: Currency,
): Promise<CartDrawerView> {
  return getCartDrawerView(locale, currency);
}
