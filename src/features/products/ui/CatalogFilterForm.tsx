import { AppLink } from '@/components/ui/AppLink';
import {
  formatDisplayPriceInput,
  type CatalogFilters,
} from '@/features/products/domain/catalog-filters';
import type { CatalogCategoryOption } from '@/features/products/queries';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import { currencies, type Currency } from '@/lib/money/currency';

type Props = {
  locale: string;
  filters: CatalogFilters;
  categories: CatalogCategoryOption[];
  currency: Currency;
  copy: Dictionary['catalog'];
};

export function getCatalogHref(
  locale: string,
  filters: CatalogFilters,
  options: { omitted?: string; page?: number } = {},
): string {
  const omitted = options.omitted ?? '';
  const params = new URLSearchParams();
  if (omitted !== 'q' && filters.q) params.set('q', filters.q);
  if (omitted !== 'minPrice' && filters.minPrice != null) {
    params.set('minPrice', formatDisplayPriceInput(filters.minPrice, filters.priceCurrency));
  }
  if (omitted !== 'maxPrice' && filters.maxPrice != null) {
    params.set('maxPrice', formatDisplayPriceInput(filters.maxPrice, filters.priceCurrency));
  }
  if (filters.minPrice != null || filters.maxPrice != null) {
    params.set('priceCurrency', filters.priceCurrency);
  }
  if (omitted !== 'category' && filters.category) {
    params.set('category', filters.category);
  }
  if (omitted !== 'inStock' && filters.inStock != null) {
    params.set('inStock', String(filters.inStock));
  }
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.pageSize !== 24) {
    params.set('pageSize', String(filters.pageSize));
  }
  if (options.page != null && options.page > 1) {
    params.set('page', String(options.page));
  }
  const query = params.toString();
  return `/${locale}/products${query ? `?${query}` : ''}`;
}

function getFilterChips(
  filters: CatalogFilters,
  copy: Dictionary['catalog'],
  categories: CatalogCategoryOption[],
): Array<{ key: string; label: string }> {
  const chips: Array<{ key: string; label: string }> = [];
  if (filters.q) chips.push({ key: 'q', label: `${copy.search}: ${filters.q}` });
  if (filters.minPrice != null) {
    chips.push({
      key: 'minPrice',
      label: `${copy.minPrice}: ${formatDisplayPriceInput(filters.minPrice, filters.priceCurrency)} ${filters.priceCurrency}`,
    });
  }
  if (filters.maxPrice != null) {
    chips.push({
      key: 'maxPrice',
      label: `${copy.maxPrice}: ${formatDisplayPriceInput(filters.maxPrice, filters.priceCurrency)} ${filters.priceCurrency}`,
    });
  }
  if (filters.category) {
    const category = categories.find((option) => option.slug === filters.category);
    chips.push({
      key: 'category',
      label: category?.title ?? filters.category,
    });
  }
  if (filters.inStock != null) {
    chips.push({
      key: 'inStock',
      label: filters.inStock ? copy.inStock : copy.outOfStock,
    });
  }
  return chips;
}

export function CatalogFilterForm({ locale, filters, categories, currency, copy }: Props) {
  const chips = getFilterChips(filters, copy, categories);
  const priceStep = currency === 'AMD' ? '1' : '0.01';

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900">{copy.filtersLabel}</h2>
      <form
        action={`/${locale}/products`}
        method="get"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="space-y-1">
          <span className="block text-sm font-medium text-gray-700">{copy.search}</span>
          <input
            type="search"
            name="q"
            maxLength={120}
            defaultValue={filters.q}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-gray-700">
            {copy.minPrice} ({currency})
          </span>
          <input
            type="number"
            name="minPrice"
            min="0"
            step={priceStep}
            defaultValue={formatDisplayPriceInput(filters.minPrice, currency)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-gray-700">
            {copy.maxPrice} ({currency})
          </span>
          <input
            type="number"
            name="maxPrice"
            min="0"
            step={priceStep}
            defaultValue={formatDisplayPriceInput(filters.maxPrice, currency)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-gray-700">{copy.priceCurrency}</span>
          <select
            name="priceCurrency"
            defaultValue={currency}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {currencies.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-gray-700">{copy.category}</span>
          <select
            name="category"
            defaultValue={filters.category ?? ''}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">{copy.allCategories}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.title}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-gray-700">{copy.availability}</span>
          <select
            name="inStock"
            defaultValue={filters.inStock == null ? '' : String(filters.inStock)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">{copy.anyAvailability}</option>
            <option value="true">{copy.inStock}</option>
            <option value="false">{copy.outOfStock}</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-gray-700">{copy.sort}</span>
          <select
            name="sort"
            defaultValue={filters.sort}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="newest">{copy.sortNewest}</option>
            <option value="price_asc">{copy.sortPriceAscending}</option>
            <option value="price_desc">{copy.sortPriceDescending}</option>
            <option value="popular">{copy.sortPopular}</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-gray-700">{copy.pageSize}</span>
          <select
            name="pageSize"
            defaultValue={String(filters.pageSize)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="12">12</option>
            <option value="24">24</option>
            <option value="48">48</option>
          </select>
        </label>
        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {copy.applyFilters}
          </button>
          <AppLink
            href={`/${locale}/products`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {copy.clearFilters}
          </AppLink>
        </div>
      </form>

      {chips.length > 0 ? (
        <ul aria-label={copy.activeFilters} className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>
              <AppLink
                href={getCatalogHref(locale, filters, { omitted: chip.key })}
                aria-label={copy.removeFilter.replace('{filter}', chip.label)}
                className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
              >
                {chip.label} <span aria-hidden="true">×</span>
              </AppLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
