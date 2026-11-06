/** Status pill classes — green success / red danger / yellow pending / blue in-progress. */
export function orderStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "PENDING" || normalized === "CONFIRMED") {
    return "bg-yellow-100 text-yellow-800";
  }
  if (normalized === "PROCESSING" || normalized === "SHIPPED") {
    return "bg-blue-100 text-blue-800";
  }
  if (normalized === "DELIVERED") {
    return "bg-green-100 text-green-800";
  }
  if (normalized === "CANCELLED" || normalized === "REFUNDED") {
    return "bg-red-100 text-red-800";
  }
  return "bg-gray-100 text-gray-800";
}

export function paymentStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "PAID" || normalized === "CAPTURED") {
    return "bg-green-100 text-green-800";
  }
  if (normalized === "PENDING" || normalized === "AUTHORIZED") {
    return "bg-yellow-100 text-yellow-800";
  }
  if (
    normalized === "FAILED" ||
    normalized === "CANCELLED" ||
    normalized === "REFUNDED"
  ) {
    return "bg-red-100 text-red-800";
  }
  return "bg-gray-100 text-gray-800";
}

export const ADMIN_BADGE =
  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium";
