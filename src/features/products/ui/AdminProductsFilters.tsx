"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { ADMIN_LABEL } from "@/features/admin/ui/admin-form-classes";
import { AdminSearchInput } from "@/features/admin/ui/AdminSearchInput";
import type { AdminCategoryOption } from "@/features/products/application/list-admin-products";

type AdminProductsFiltersProps = {
  total: number;
  q?: string;
  sku?: string;
  categoryId?: string;
  stock: "all" | "in_stock" | "out_of_stock" | "low_stock";
  categories: AdminCategoryOption[];
  sort: string;
  dir: string;
};

const STOCK_OPTIONS = [
  { label: "All Products", value: "all" },
  { label: "In stock", value: "in_stock" },
  { label: "Out of stock", value: "out_of_stock" },
  { label: "Low stock", value: "low_stock" },
] as const;

export function AdminProductsFilters({
  total,
  q,
  sku,
  categoryId,
  stock,
  categories,
  sort,
  dir,
}: AdminProductsFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [categoryValue, setCategoryValue] = useState(categoryId ?? "");
  const [stockValue, setStockValue] = useState(stock);

  const categoryOptions = categories.map((category) => ({
    label: category.title,
    value: category.id,
  }));

  function applyCategory(next: string): void {
    flushSync(() => setCategoryValue(next));
    formRef.current?.requestSubmit();
  }

  function applyStock(next: string): void {
    flushSync(() =>
      setStockValue(next as AdminProductsFiltersProps["stock"]),
    );
    formRef.current?.requestSubmit();
  }

  return (
    <div className="mb-4">
      <p className="mb-3 text-sm text-gray-600">Total products: {total}</p>
      <form
        ref={formRef}
        method="get"
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <label>
          <span className={ADMIN_LABEL}>Search by title or slug</span>
          <AdminSearchInput
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by title or slug..."
            wrapperClassName="mt-1"
            aria-label="Search by title or slug"
          />
        </label>
        <label>
          <span className={ADMIN_LABEL}>Search by SKU</span>
          <AdminSearchInput
            name="sku"
            defaultValue={sku ?? ""}
            placeholder="Enter SKU code"
            wrapperClassName="mt-1"
            aria-label="Search by SKU"
          />
        </label>
        <div>
          <span className={ADMIN_LABEL}>Filter by Category</span>
          <SelectDropdown
            name="categoryId"
            ariaLabel="Filter by category"
            value={categoryValue}
            allLabel="All Categories"
            options={categoryOptions}
            className="mt-1"
            onValueChange={applyCategory}
          />
        </div>
        <div>
          <span className={ADMIN_LABEL}>Filter by Stock</span>
          <SelectDropdown
            name="stock"
            ariaLabel="Filter by stock"
            value={stockValue}
            options={STOCK_OPTIONS}
            className="mt-1"
            onValueChange={applyStock}
          />
        </div>
      </form>
    </div>
  );
}
