'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { SelectDropdown } from '@/components/ui/SelectDropdown';
import { ADMIN_LABEL } from '@/features/admin/ui/admin-form-classes';
import { AdminSearchInput } from '@/features/admin/ui/AdminSearchInput';
import { useAdminDictionary } from '@/features/admin/ui/AdminI18nContext';
import type { AdminCategoryOption } from '@/features/products/application/list-admin-products';

type AdminProductsFiltersProps = {
  total: number;
  q?: string;
  sku?: string;
  categoryId?: string;
  stock: 'all' | 'in_stock' | 'out_of_stock' | 'low_stock';
  categories: AdminCategoryOption[];
  sort: string;
  dir: string;
};

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
  const { products: copy } = useAdminDictionary();
  const formRef = useRef<HTMLFormElement>(null);
  const [categoryValue, setCategoryValue] = useState(categoryId ?? '');
  const [stockValue, setStockValue] = useState(stock);

  const categoryOptions = categories.map((category) => ({
    label: category.title,
    value: category.id,
  }));
  const stockOptions = [
    { label: copy.allProducts, value: 'all' },
    { label: copy.inStock, value: 'in_stock' },
    { label: copy.outOfStock, value: 'out_of_stock' },
    { label: copy.lowStock, value: 'low_stock' },
  ];

  function applyCategory(next: string): void {
    flushSync(() => setCategoryValue(next));
    formRef.current?.requestSubmit();
  }

  function applyStock(next: string): void {
    flushSync(() => setStockValue(next as AdminProductsFiltersProps['stock']));
    formRef.current?.requestSubmit();
  }

  return (
    <div className="mb-4">
      <p className="mb-3 text-sm text-gray-600">
        {copy.total}: {total}
      </p>
      <form ref={formRef} method="get" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <label>
          <span className={ADMIN_LABEL}>{copy.searchTitle}</span>
          <AdminSearchInput
            name="q"
            defaultValue={q ?? ''}
            placeholder={copy.searchTitlePlaceholder}
            wrapperClassName="mt-1"
            aria-label={copy.searchTitle}
          />
        </label>
        <label>
          <span className={ADMIN_LABEL}>{copy.searchSku}</span>
          <AdminSearchInput
            name="sku"
            defaultValue={sku ?? ''}
            placeholder={copy.searchSkuPlaceholder}
            wrapperClassName="mt-1"
            aria-label={copy.searchSku}
          />
        </label>
        <div>
          <span className={ADMIN_LABEL}>{copy.filterCategory}</span>
          <SelectDropdown
            name="categoryId"
            ariaLabel={copy.filterCategory}
            value={categoryValue}
            allLabel={copy.allCategories}
            options={categoryOptions}
            className="mt-1"
            onValueChange={applyCategory}
          />
        </div>
        <div>
          <span className={ADMIN_LABEL}>{copy.filterStock}</span>
          <SelectDropdown
            name="stock"
            ariaLabel={copy.filterStock}
            value={stockValue}
            options={stockOptions}
            className="mt-1"
            onValueChange={applyStock}
          />
        </div>
      </form>
    </div>
  );
}
