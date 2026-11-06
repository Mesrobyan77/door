"use server";

import { getAdminOrderDetailView } from "@/features/orders/application/order-detail-view";
import type { AdminOrderDetailView } from "@/features/orders/application/order-detail-view";
import { requireAdmin } from "@/lib/auth/policies";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

/**
 * Admin-only fetch of a single order for the order details drawer.
 */
export async function getAdminOrderDetailAction(
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

  await requireAdmin(locale as Locale);

  const detail = await getAdminOrderDetailView(trimmed);
  if (!detail) {
    return err("NOT_FOUND", "Order not found.");
  }

  return ok(detail);
}
