"use server";

import {
  toAdminOrderDetailView,
  type AdminOrderDetailView,
} from "@/features/orders/application/order-detail-view";
import { getAdminOrderByNumber } from "@/features/orders/application/queries";
import { getStoreIdentity } from "@/features/settings/application/queries";
import { requireUser } from "@/lib/auth/policies";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

/**
 * Customer-owned fetch of a single order for the profile order details drawer.
 * Returns NOT_FOUND when the order is missing or belongs to another user.
 */
export async function getCustomerOrderDetailAction(
  locale: string,
  orderNumber: string,
): Promise<Result<AdminOrderDetailView>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const trimmed = orderNumber.trim();
  if (!trimmed || trimmed.length > 64) {
    return err("VALIDATION_ERROR", "Invalid order number.");
  }

  const user = await requireUser(locale as Locale);
  const loaded = await getAdminOrderByNumber(trimmed);

  if (!loaded || loaded.order.userId !== user.id) {
    return err("NOT_FOUND", "Order not found.");
  }

  const identity = await getStoreIdentity();
  return ok(toAdminOrderDetailView(loaded, identity.name));
}
