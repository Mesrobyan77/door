import { z } from 'zod';

import { isVariantPurchasable } from '@/features/products/domain/door-variant';
import type { CatalogProduct, ProductVariantOption } from '@/features/products/types';
import { convertAmount } from '@/lib/money/convert';
import { currencyMeta } from '@/lib/money/currency-meta';
import { defaultCurrency, isCurrency, type Currency } from '@/lib/money/currency';

export const catalogSorts = ['newest', 'price_asc', 'price_desc', 'popular'] as const;

export type CatalogSort = (typeof catalogSorts)[number];

export type CatalogFilters = {
  q: string;
  minPrice: number | null;
  maxPrice: number | null;
  priceCurrency: Currency;
  category: string | null;
  inStock: boolean | null;
  sort: CatalogSort;
  page: number;
  pageSize: 12 | 24 | 48;
};

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

const singleStringSchema = z.string().max(200);
const pageSizeSchema = z.enum(['12', '24', '48']);
const pageSizes = { '12': 12, '24': 24, '48': 48 } as const;
const pageSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(10_000));
const sortSchema = z.enum(catalogSorts);

function getSingleValue(params: CatalogSearchParams, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = singleStringSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseDisplayPriceAmount(
  value: string | undefined,
  currency: Currency,
): number | null {
  if (!value) return null;
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return null;

  const scale = currencyMeta[currency].scale;
  const wholePart = match[1];
  const fractionalPart = match[2] ?? '';
  if (!wholePart || fractionalPart.length > scale || (scale === 0 && fractionalPart.length > 0)) {
    return null;
  }

  try {
    const factor = 10n ** BigInt(scale);
    const whole = BigInt(wholePart);
    const fractional = BigInt(fractionalPart.padEnd(scale, '0') || '0');
    const amount = whole * factor + fractional;
    return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
  } catch {
    return null;
  }
}

export function formatDisplayPriceInput(amount: number | null, currency: Currency): string {
  if (amount == null) return '';
  const scale = currencyMeta[currency].scale;
  if (scale === 0) return String(amount);

  const factor = 10 ** scale;
  const whole = Math.floor(amount / factor);
  const fractional = String(amount % factor).padStart(scale, '0');
  return `${whole}.${fractional}`;
}

export function parseCatalogFilters(
  params: CatalogSearchParams,
  selectedCurrency: Currency,
  activeCategorySlugs: ReadonlySet<string>,
): CatalogFilters {
  const rawPriceCurrency = getSingleValue(params, 'priceCurrency');
  const priceCurrency =
    rawPriceCurrency && isCurrency(rawPriceCurrency) ? rawPriceCurrency : selectedCurrency;
  let minPrice = parseDisplayPriceAmount(getSingleValue(params, 'minPrice'), priceCurrency);
  let maxPrice = parseDisplayPriceAmount(getSingleValue(params, 'maxPrice'), priceCurrency);
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    minPrice = null;
    maxPrice = null;
  }

  const rawQuery = getSingleValue(params, 'q')?.trim().replace(/\s+/g, ' ');
  const rawCategory = getSingleValue(params, 'category')?.trim();
  const rawStock = getSingleValue(params, 'inStock');
  const rawSort = sortSchema.safeParse(getSingleValue(params, 'sort'));
  const rawPageSize = pageSizeSchema.safeParse(getSingleValue(params, 'pageSize'));
  const rawPage = pageSchema.safeParse(getSingleValue(params, 'page'));

  return {
    q: rawQuery?.slice(0, 120) ?? '',
    minPrice,
    maxPrice,
    priceCurrency,
    category: rawCategory && activeCategorySlugs.has(rawCategory) ? rawCategory : null,
    inStock: rawStock === 'true' ? true : rawStock === 'false' ? false : null,
    sort: rawSort.success ? rawSort.data : 'newest',
    page: rawPage.success ? rawPage.data : 1,
    pageSize: rawPageSize.success ? pageSizes[rawPageSize.data] : 24,
  };
}

export function getMatchingCatalogVariant(
  product: CatalogProduct,
  filters: Pick<CatalogFilters, 'minPrice' | 'maxPrice' | 'priceCurrency' | 'inStock'>,
  rate: string,
): ProductVariantOption | null {
  if (filters.inStock === false && product.stockOnHand > 0) {
    return null;
  }

  const eligible = product.variants.filter((variant) => {
    if (variant.status !== 'ACTIVE' || variant.priceAmount == null) {
      return false;
    }

    if (filters.inStock === true && variant.stockOnHand < 1) {
      return false;
    }

    const validConfiguration = isVariantPurchasable({
      product: {
        doorClassification: product.doorSpecifications.classification,
        openingMechanism: product.doorSpecifications.openingMechanism,
      },
      variant: {
        ...variant,
        stockOnHand: Math.max(1, variant.stockOnHand),
      },
    });
    if (!validConfiguration) return false;

    const displayAmount = convertAmount(
      variant.priceAmount,
      rate,
      defaultCurrency,
      filters.priceCurrency,
    ).amount;
    if (filters.minPrice != null && displayAmount < BigInt(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice != null && displayAmount > BigInt(filters.maxPrice)) {
      return false;
    }

    return true;
  });

  return (
    eligible.sort((first, second) => {
      const firstAmount = convertAmount(
        first.priceAmount ?? 0,
        rate,
        defaultCurrency,
        filters.priceCurrency,
      ).amount;
      const secondAmount = convertAmount(
        second.priceAmount ?? 0,
        rate,
        defaultCurrency,
        filters.priceCurrency,
      ).amount;
      return firstAmount < secondAmount
        ? -1
        : firstAmount > secondAmount
          ? 1
          : first.sku.localeCompare(second.sku);
    })[0] ?? null
  );
}

export const defaultCatalogFilters: CatalogFilters = {
  q: '',
  minPrice: null,
  maxPrice: null,
  priceCurrency: defaultCurrency,
  category: null,
  inStock: null,
  sort: 'newest',
  page: 1,
  pageSize: 24,
};

export function catalogFiltersNeedVariantMatch(filters: CatalogFilters): boolean {
  return filters.minPrice != null || filters.maxPrice != null || filters.inStock != null;
}
