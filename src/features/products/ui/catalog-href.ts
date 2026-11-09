import {
  formatDisplayPriceInput,
  type CatalogFilters,
} from '@/features/products/domain/catalog-filters';

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
  if (omitted !== 'category' && filters.category) params.set('category', filters.category);
  if (omitted !== 'inStock' && filters.inStock != null) {
    params.set('inStock', String(filters.inStock));
  }
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.pageSize !== 24) params.set('pageSize', String(filters.pageSize));
  if (options.page != null && options.page > 1) params.set('page', String(options.page));
  const query = params.toString();
  return `/${locale}/products${query ? `?${query}` : ''}`;
}
