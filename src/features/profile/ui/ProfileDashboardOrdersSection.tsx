"use client";

import { useState, useTransition } from "react";

import { AppLink } from "@/components/ui/AppLink";
import type { AdminOrderDetailView } from "@/features/orders/application/order-detail-view";
import { getCustomerOrderDetailAction } from "@/features/orders/application/get-customer-order-detail";
import { OrderDetailsDrawer } from "@/features/orders/ui/OrderDetailsDrawer";
import {
  formatOrderDrawerMoney,
  formatOrderStatusLabel,
} from "@/features/orders/ui/order-drawer-format";
import type { ProfileRecentOrder } from "@/features/profile/application/dashboard-queries";
import { formatShortDate } from "@/features/profile/ui/format-short-date";
import { ProfileRecentOrderCard } from "@/features/profile/ui/ProfileRecentOrderCard";
import {
  PROFILE_CARD_CLASS,
  PROFILE_PRIMARY_BUTTON_CLASS,
  PROFILE_SECTION_TITLE_CLASS,
} from "@/features/profile/ui/profile-surface-classes";

type ProfileDashboardOrdersSectionProps = {
  locale: string;
  orders: ProfileRecentOrder[];
  labels: {
    recentOrders: string;
    viewAllOrders: string;
    noOrders: string;
    startShopping: string;
    orderNumber: string;
    viewDetails: string;
    placedOn: string;
    item: string;
    items: string;
  };
};

export function ProfileDashboardOrdersSection({
  locale,
  orders,
  labels,
}: ProfileDashboardOrdersSectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AdminOrderDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openOrder(orderNumber: string): void {
    setDrawerOpen(true);
    setDetail(null);
    setError(null);

    startTransition(async () => {
      const result = await getCustomerOrderDetailAction(locale, orderNumber);
      if (!result.ok) {
        setError(result.error.message);
        setDetail(null);
        return;
      }
      setDetail(result.value);
    });
  }

  function closeDrawer(): void {
    setDrawerOpen(false);
    setDetail(null);
    setError(null);
  }

  return (
    <>
      <div className={`p-5 sm:p-7 ${PROFILE_CARD_CLASS}`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className={PROFILE_SECTION_TITLE_CLASS}>{labels.recentOrders}</h2>
          <AppLink
            href={`/${locale}/profile/orders`}
            prefetchPolicy="intent"
            className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80"
          >
            {labels.viewAllOrders}
            <span aria-hidden>→</span>
          </AppLink>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-12">
            <p className="max-w-sm text-center text-sm text-gray-600">
              {labels.noOrders}
            </p>
            <AppLink
              href={`/${locale}/products`}
              prefetchPolicy="intent"
              className={PROFILE_PRIMARY_BUTTON_CLASS}
            >
              {labels.startShopping}
            </AppLink>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => {
              const itemWord =
                order.itemsCount === 1 ? labels.item : labels.items;
              return (
                <li key={order.id} className="min-w-0">
                  <ProfileRecentOrderCard
                    orderNumber={order.orderNumber}
                    status={formatOrderStatusLabel(order.status)}
                    totalLabel={formatOrderDrawerMoney(order.totalAmount, "AMD")}
                    metaLine={`${order.itemsCount} ${itemWord}`}
                    placedOnLine={`${labels.placedOn} ${formatShortDate(order.placedAt, locale)}`}
                    orderNumberLabel={labels.orderNumber}
                    viewDetailsLabel={labels.viewDetails}
                    onViewDetails={() => openOrder(order.orderNumber)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <OrderDetailsDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        detail={detail}
        error={error}
        isLoading={isPending}
      />
    </>
  );
}
