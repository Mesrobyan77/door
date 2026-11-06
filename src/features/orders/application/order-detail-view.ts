import "server-only";

import { mediaPublicUrl } from "@/lib/media/public-url";
import { getStoreIdentity } from "@/features/settings/application/queries";
import {
  getAdminOrderByNumber,
  type AdminOrderDetail,
} from "@/features/orders/application/queries";

export type AdminOrderDetailItemView = {
  id: string;
  title: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceAmount: number;
  lineTotalAmount: number;
  currency: string;
};

export type AdminOrderDetailView = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  baseCurrency: string;
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  totalAmount: number;
  deliveryLabel: string | null;
  couponCode: string | null;
  isPickup: boolean;
  storeName: string;
  shippingMethod: string;
  addressLine: string;
  addressHint: string | null;
  paymentMethod: string;
  paymentAmount: number;
  items: AdminOrderDetailItemView[];
};

function formatAddressLine(
  address: AdminOrderDetail["order"]["shippingAddress"],
): string {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.region,
    address.postalCode,
    address.countryCode,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return parts.join(", ");
}

function paymentMethodLabel(method: string): string {
  const normalized = method.toUpperCase();
  if (normalized === "COD" || normalized === "CASH") {
    return "Cash";
  }
  if (normalized === "IDRAM") {
    return "Idram";
  }
  if (normalized === "ARCA") {
    return "ArCa";
  }
  return method;
}

/** Maps a loaded order into a serializable admin drawer view. */
export function toAdminOrderDetailView(
  detail: AdminOrderDetail,
  storeName: string,
): AdminOrderDetailView {
  const { order, items, payments } = detail;
  const isPickup = order.deliveryLabelSnapshot === "Store pickup";
  const latestPayment = payments[0] ?? null;

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    contactName: order.contactName,
    contactEmail: order.contactEmail,
    contactPhone: order.contactPhone,
    baseCurrency: order.baseCurrency,
    subtotalAmount: order.subtotalAmount,
    deliveryAmount: order.deliveryAmount,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    deliveryLabel: order.deliveryLabelSnapshot,
    couponCode: order.promotionCodeSnapshot,
    isPickup,
    storeName,
    shippingMethod: isPickup
      ? "pickup"
      : (order.deliveryLabelSnapshot ?? "delivery"),
    addressLine: formatAddressLine(order.shippingAddress),
    addressHint: isPickup
      ? "You can pick up your order at this store"
      : null,
    paymentMethod: latestPayment
      ? paymentMethodLabel(latestPayment.method)
      : "—",
    paymentAmount: latestPayment?.amount ?? order.totalAmount,
    items: items.map((item) => ({
      id: item.id,
      title: item.productTitleSnapshot,
      sku: item.productSkuSnapshot,
      imageUrl: item.productImageKeySnapshot
        ? mediaPublicUrl(item.productImageKeySnapshot)
        : null,
      quantity: item.quantity,
      unitPriceAmount: item.unitBaseAmount,
      lineTotalAmount: item.lineTotalAmount,
      currency: item.currency,
    })),
  };
}

/** Loads order detail shaped for the admin drawer. */
export async function getAdminOrderDetailView(
  orderNumber: string,
): Promise<AdminOrderDetailView | null> {
  const detail = await getAdminOrderByNumber(orderNumber);
  if (!detail) {
    return null;
  }

  const identity = await getStoreIdentity();
  return toAdminOrderDetailView(detail, identity.name);
}
