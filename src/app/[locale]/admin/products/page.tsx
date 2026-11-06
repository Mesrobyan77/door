import Link from "next/link";
import { notFound } from "next/navigation";

import {
  listAdminCategoryOptions,
  listAdminProducts,
} from "@/features/products/application/list-admin-products";
import { adminProductsFilterSchema } from "@/features/products/schemas/admin-list";
import { AdminProductsFilters } from "@/features/products/ui/AdminProductsFilters";
import { AdminProductsView } from "@/features/products/ui/AdminProductsView";
import { isLocale } from "@/lib/i18n/config";

type AdminProductsPageProps = {
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

function buildQuery(
  filters: {
    q?: string;
    sku?: string;
    categoryId?: string;
    stock: string;
    sort: string;
    dir: string;
    page: number;
  },
  overrides: Partial<typeof filters> = {},
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.sku) params.set("sku", merged.sku);
  if (merged.categoryId) params.set("categoryId", merged.categoryId);
  if (merged.stock !== "all") params.set("stock", merged.stock);
  if (merged.sort !== "created") params.set("sort", merged.sort);
  if (merged.dir !== "desc") params.set("dir", merged.dir);
  if (merged.page > 1) params.set("page", String(merged.page));
  return params.toString();
}

export default async function AdminProductsPage({
  params,
  searchParams,
}: AdminProductsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const raw = await searchParams;
  const parsed = adminProductsFilterSchema.safeParse({
    q: firstParam(raw.q) || undefined,
    sku: firstParam(raw.sku) || undefined,
    categoryId: firstParam(raw.categoryId) || undefined,
    stock: firstParam(raw.stock) ?? "all",
    sort: firstParam(raw.sort) ?? "created",
    dir: firstParam(raw.dir) ?? "desc",
    page: firstParam(raw.page) ?? "1",
  });

  const filters = parsed.success
    ? parsed.data
    : {
        page: 1 as const,
        stock: "all" as const,
        sort: "created" as const,
        dir: "desc" as const,
        q: undefined,
        sku: undefined,
        categoryId: undefined,
      };

  const [{ rows, total, pageSize }, categories] = await Promise.all([
    listAdminProducts(locale, filters),
    listAdminCategoryOptions(locale),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function sortHref(sort: "title" | "stock" | "price" | "created"): string {
    const nextDir =
      filters.sort === sort && filters.dir === "asc" ? "desc" : "asc";
    const query = buildQuery(filters, {
      sort,
      dir: filters.sort === sort ? nextDir : "asc",
      page: 1,
    });
    return query
      ? `/${locale}/admin/products?${query}`
      : `/${locale}/admin/products`;
  }

  const sortLinks = {
    title: sortHref("title"),
    stock: sortHref("stock"),
    price: sortHref("price"),
    created: sortHref("created"),
  };

  return (
    <section>
      <AdminProductsFilters
        total={total}
        q={filters.q}
        sku={filters.sku}
        categoryId={filters.categoryId}
        stock={filters.stock}
        categories={categories}
        sort={filters.sort}
        dir={filters.dir}
      />

      <AdminProductsView
        locale={locale}
        products={rows}
        sortLinks={sortLinks}
        categories={categories}
      />

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center gap-3 text-sm text-gray-700">
          {filters.page > 1 ? (
            <Link
              href={`/${locale}/admin/products?${buildQuery(filters, { page: filters.page - 1 })}`}
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
              href={`/${locale}/admin/products?${buildQuery(filters, { page: filters.page + 1 })}`}
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
