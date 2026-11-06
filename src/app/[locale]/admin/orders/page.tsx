import Link from "next/link";
import { notFound } from "next/navigation";

import { ADMIN_PAGE_TITLE } from "@/features/admin/ui/admin-form-classes";
import { listAdminOrders } from "@/features/orders/application/queries";
import type { OrderStatus } from "@/features/orders/domain/order-status";
import { adminOrdersFilterSchema } from "@/features/orders/schemas/change-status";
import { AdminOrdersFilters } from "@/features/orders/ui/AdminOrdersFilters";
import { AdminOrdersView } from "@/features/orders/ui/AdminOrdersView";
import { isLocale } from "@/lib/i18n/config";

type AdminOrdersPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function buildOrdersQuery(
  filters: {
    q?: string;
    status?: OrderStatus;
    paymentStatus?: string;
    page: number;
  },
  page: number,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  params.set("page", String(page));
  return params.toString();
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: AdminOrdersPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const raw = await searchParams;
  const parsed = adminOrdersFilterSchema.safeParse({
    status: firstParam(raw.status) || undefined,
    paymentStatus: firstParam(raw.paymentStatus) || undefined,
    archived: "active",
    q: firstParam(raw.q) || undefined,
    page: firstParam(raw.page) ?? "1",
  });

  const filters = parsed.success
    ? parsed.data
    : {
        page: 1 as const,
        archived: "active" as const,
        status: undefined,
        paymentStatus: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        q: undefined,
      };

  const { rows, total, pageSize } = await listAdminOrders(filters);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section>
      <div className="mb-6">
        <h1 className={ADMIN_PAGE_TITLE}>Orders</h1>
      </div>

      <AdminOrdersFilters
        total={total}
        status={filters.status}
        paymentStatus={filters.paymentStatus}
        q={filters.q}
      />

      <AdminOrdersView locale={locale} orders={rows} />

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center gap-3 text-sm text-gray-700">
          {filters.page > 1 ? (
            <Link
              href={`/${locale}/admin/orders?${buildOrdersQuery(filters, filters.page - 1)}`}
              className="font-medium hover:underline"
            >
              Previous
            </Link>
          ) : null}
          <span>
            Page {filters.page} / {totalPages}
          </span>
          {filters.page < totalPages ? (
            <Link
              href={`/${locale}/admin/orders?${buildOrdersQuery(filters, filters.page + 1)}`}
              className="font-medium hover:underline"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
