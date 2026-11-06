import Link from "next/link";
import { notFound } from "next/navigation";

import { listAdminUsers } from "@/features/users/application/queries";
import { adminUsersFilterSchema } from "@/features/users/schemas/admin-users";
import { AdminUsersView } from "@/features/users/ui/AdminUsersView";
import { isLocale } from "@/lib/i18n/config";

type AdminUsersPageProps = {
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

function buildUsersQuery(
  filters: {
    q?: string;
    role?: string;
    status?: string;
    page: number;
  },
  page: number,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(page));
  return params.toString();
}

export default async function AdminUsersPage({
  params,
  searchParams,
}: AdminUsersPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const raw = await searchParams;
  const parsed = adminUsersFilterSchema.safeParse({
    q: firstParam(raw.q) || undefined,
    role: firstParam(raw.role) || undefined,
    status: firstParam(raw.status) || undefined,
    page: firstParam(raw.page) ?? "1",
  });

  const filters = parsed.success
    ? parsed.data
    : { page: 1 as const, q: undefined, role: undefined, status: undefined };

  const { rows, total, pageSize } = await listAdminUsers(filters);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <AdminUsersView
        locale={locale}
        users={rows}
        total={total}
        q={filters.q}
        role={filters.role}
      />

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center gap-3 text-sm text-gray-700">
          {filters.page > 1 ? (
            <Link
              href={`/${locale}/admin/users?${buildUsersQuery(filters, filters.page - 1)}`}
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
              href={`/${locale}/admin/users?${buildUsersQuery(filters, filters.page + 1)}`}
              className="font-medium hover:underline"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
