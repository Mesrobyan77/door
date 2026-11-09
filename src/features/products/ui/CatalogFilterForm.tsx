'use client';

import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { AppLink } from '@/components/ui/AppLink';
import { SideSheet } from '@/components/ui/SideSheet';
import {
  formatDisplayPriceInput,
  type CatalogFilters,
} from '@/features/products/domain/catalog-filters';
import type { CatalogCategoryOption } from '@/features/products/queries';
import { getCatalogHref } from '@/features/products/ui/catalog-href';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import { currencies, type Currency } from '@/lib/money/currency';

type Props = {
  locale: string;
  filters: CatalogFilters;
  categories: CatalogCategoryOption[];
  currency: Currency;
  copy: Dictionary['catalog'];
};

function getFilterChips(
  filters: CatalogFilters,
  copy: Dictionary['catalog'],
  categories: CatalogCategoryOption[],
) {
  const chips: Array<{ key: string; label: string }> = [];
  if (filters.q) chips.push({ key: 'q', label: `${copy.search}: ${filters.q}` });
  if (filters.minPrice != null)
    chips.push({
      key: 'minPrice',
      label: `${copy.minPrice}: ${formatDisplayPriceInput(filters.minPrice, filters.priceCurrency)} ${filters.priceCurrency}`,
    });
  if (filters.maxPrice != null)
    chips.push({
      key: 'maxPrice',
      label: `${copy.maxPrice}: ${formatDisplayPriceInput(filters.maxPrice, filters.priceCurrency)} ${filters.priceCurrency}`,
    });
  if (filters.category)
    chips.push({
      key: 'category',
      label:
        categories.find((option) => option.slug === filters.category)?.title ?? filters.category,
    });
  if (filters.inStock != null)
    chips.push({ key: 'inStock', label: filters.inStock ? copy.inStock : copy.outOfStock });
  return chips;
}

function FilterFields({ locale, filters, categories, currency, copy }: Props) {
  const priceStep = currency === 'AMD' ? '1' : '0.01';
  return (
    <form action={`/${locale}/products`} method="get" className="catalog-filter-fields">
      <details open>
        <summary>{copy.search}</summary>
        <input type="search" name="q" maxLength={120} defaultValue={filters.q} />
      </details>
      <details open>
        <summary>{copy.category}</summary>
        <select name="category" defaultValue={filters.category ?? ''}>
          <option value="">{copy.allCategories}</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.title}
            </option>
          ))}
        </select>
      </details>
      <details open>
        <summary>
          {copy.minPrice} / {copy.maxPrice}
        </summary>
        <div className="grid grid-cols-2 gap-2">
          <input
            aria-label={`${copy.minPrice} (${currency})`}
            type="number"
            name="minPrice"
            min="0"
            step={priceStep}
            placeholder={copy.minPrice}
            defaultValue={formatDisplayPriceInput(filters.minPrice, currency)}
          />
          <input
            aria-label={`${copy.maxPrice} (${currency})`}
            type="number"
            name="maxPrice"
            min="0"
            step={priceStep}
            placeholder={copy.maxPrice}
            defaultValue={formatDisplayPriceInput(filters.maxPrice, currency)}
          />
        </div>
        <select aria-label={copy.priceCurrency} name="priceCurrency" defaultValue={currency}>
          {currencies.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </details>
      <details open>
        <summary>{copy.availability}</summary>
        <select
          name="inStock"
          defaultValue={filters.inStock == null ? '' : String(filters.inStock)}
        >
          <option value="">{copy.anyAvailability}</option>
          <option value="true">{copy.inStock}</option>
          <option value="false">{copy.outOfStock}</option>
        </select>
      </details>
      <details>
        <summary>{copy.pageSize}</summary>
        <select name="pageSize" defaultValue={String(filters.pageSize)}>
          <option value="12">12</option>
          <option value="24">24</option>
          <option value="48">48</option>
        </select>
      </details>
      {filters.sort !== 'newest' ? <input type="hidden" name="sort" value={filters.sort} /> : null}
      <div className="catalog-filter-actions">
        <button type="submit">{copy.applyFilters}</button>
        <AppLink href={`/${locale}/products`}>{copy.clearFilters}</AppLink>
      </div>
    </form>
  );
}

export function CatalogFilterForm(props: Props) {
  const [open, setOpen] = useState(false);
  const chips = getFilterChips(props.filters, props.copy, props.categories);
  return (
    <div className="catalog-filter-column">
      <div className="lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="catalog-filter-trigger">
          <Filter className="h-4 w-4" />
          {props.copy.filtersLabel}
          {chips.length ? <span>{chips.length}</span> : null}
        </button>
      </div>
      <aside className="catalog-filter-sidebar hidden lg:block">
        <div className="catalog-filter-heading">
          <SlidersHorizontal className="h-5 w-5" />
          <h2>{props.copy.filtersLabel}</h2>
        </div>
        <FilterFields {...props} />
      </aside>
      <SideSheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel={props.copy.filtersLabel}
        side="left"
        panelClassName="catalog-filter-sheet"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="min-w-0 text-base leading-6 font-semibold">{props.copy.filtersLabel}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <FilterFields {...props} />
        </div>
      </SideSheet>
      {chips.length ? (
        <ul aria-label={props.copy.activeFilters} className="catalog-filter-chips">
          {chips.map((chip) => (
            <li key={chip.key}>
              <AppLink
                href={getCatalogHref(props.locale, props.filters, { omitted: chip.key })}
                aria-label={props.copy.removeFilter.replace('{filter}', chip.label)}
              >
                {chip.label}
                <X className="h-3 w-3" />
              </AppLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function CatalogSortControl({
  locale,
  filters,
  copy,
}: {
  locale: string;
  filters: CatalogFilters;
  copy: Dictionary['catalog'];
}) {
  return (
    <form action={`/${locale}/products`} method="get" className="catalog-sort-control">
      {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
      {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
      {filters.minPrice != null ? (
        <input
          type="hidden"
          name="minPrice"
          value={formatDisplayPriceInput(filters.minPrice, filters.priceCurrency)}
        />
      ) : null}
      {filters.maxPrice != null ? (
        <input
          type="hidden"
          name="maxPrice"
          value={formatDisplayPriceInput(filters.maxPrice, filters.priceCurrency)}
        />
      ) : null}
      {filters.inStock != null ? (
        <input type="hidden" name="inStock" value={String(filters.inStock)} />
      ) : null}
      <input type="hidden" name="priceCurrency" value={filters.priceCurrency} />
      <input type="hidden" name="pageSize" value={String(filters.pageSize)} />
      <label>
        <span>{copy.sort}</span>
        <select name="sort" defaultValue={filters.sort}>
          <option value="newest">{copy.sortNewest}</option>
          <option value="price_asc">{copy.sortPriceAscending}</option>
          <option value="price_desc">{copy.sortPriceDescending}</option>
          <option value="popular">{copy.sortPopular}</option>
        </select>
      </label>
      <button type="submit">{copy.applyFilters}</button>
    </form>
  );
}
