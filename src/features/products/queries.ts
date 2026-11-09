import 'server-only';

import { and, asc, desc, eq, exists, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { getDb } from '@/db/client';
import {
  categories,
  mediaAssets,
  orderItems,
  orders,
  productCategories,
  productVariants,
  products,
} from '@/db/schema';
import { resolveVariantPrices } from '@/features/promotions/application/resolve-product-prices';
import { isVariantPurchasable } from '@/features/products/domain/door-variant';
import {
  catalogFiltersNeedVariantMatch,
  defaultCatalogFilters,
  getMatchingCatalogVariant,
  type CatalogFilters,
} from '@/features/products/domain/catalog-filters';
import type {
  CatalogProduct,
  ProductCategoryRef,
  ProductDetail,
  ProductGalleryImage,
} from '@/features/products/types';
import { CACHE_TAGS, PUBLIC_CACHE_REVALIDATE_SECONDS } from '@/lib/cache/tags';
import { getDatabaseCacheScope } from '@/lib/cache/database-scope';
import type { Locale } from '@/lib/i18n/config';

export type {
  CatalogProduct,
  ProductCategoryRef,
  ProductDetail,
  ProductGalleryImage,
} from '@/features/products/types';

const RELATED_PRODUCTS_LIMIT = 4;
export const CATALOG_PAGE_SIZE = 24;

export type CatalogCategoryOption = {
  slug: string;
  title: string;
};

function toCatalogProduct(
  product: typeof products.$inferSelect,
  locale: Locale,
  imageUrl: string | null = null,
  variants: ProductDetail['variants'] = [],
): Omit<
  CatalogProduct,
  'priceAmount' | 'compareAtAmount' | 'discountPercent' | 'listPriceAmount'
> | null {
  const translation = product.translations[locale] ?? product.translations.hy;
  if (!translation) {
    return null;
  }

  return {
    id: product.id,
    sku: variants[0]?.sku ?? product.sku,
    stockOnHand: variants.reduce(
      (total, variant) => total + (variant.purchasable ? variant.stockOnHand : 0),
      0,
    ),
    translation,
    imageUrl,
    variants,
    doorSpecifications: {
      brandName: product.brandName,
      modelName: product.modelName,
      collectionName: product.collectionName,
      classification: product.doorClassification,
      entranceEnvironments: product.entranceEnvironments,
      structuralMaterial: product.structuralMaterial,
      coreMaterial: product.coreMaterial,
      surfaceCoating: product.surfaceCoating,
      hasGlazing: product.hasGlazing,
      glazingType: product.glazingType,
      manufacturer: product.manufacturer,
      countryOfManufacture: product.countryOfManufacture,
      openingMechanism: product.openingMechanism,
      frameSystem: product.frameSystem,
      leafConfiguration: product.leafConfiguration,
      performanceSpecifications: product.performanceSpecifications,
    },
  };
}

async function loadPrimaryProductImages(
  productIds: string[],
): Promise<Map<string, { url: string; illustrative: boolean }>> {
  const map = new Map<string, { url: string; illustrative: boolean }>();
  if (productIds.length === 0) {
    return map;
  }

  const rows = await getDb()
    .select({
      productId: mediaAssets.productId,
      secureUrl: mediaAssets.secureUrl,
      isPrimary: mediaAssets.isPrimary,
      role: mediaAssets.role,
      sortOrder: mediaAssets.sortOrder,
      sourceMetadata: mediaAssets.sourceMetadata,
    })
    .from(mediaAssets)
    .where(
      and(
        inArray(mediaAssets.productId, productIds),
        eq(mediaAssets.uploadStatus, 'READY'),
        or(eq(mediaAssets.isPrimary, true), eq(mediaAssets.role, 'PRIMARY')),
      ),
    )
    .orderBy(asc(mediaAssets.sortOrder));

  for (const row of rows) {
    if (!row.productId || !row.secureUrl || map.has(row.productId)) {
      continue;
    }
    map.set(row.productId, {
      url: row.secureUrl,
      illustrative: row.sourceMetadata?.kind === 'ILLUSTRATIVE_PEXELS',
    });
  }

  return map;
}

async function withProductImages(
  rows: Array<typeof products.$inferSelect>,
  locale: Locale,
): Promise<CatalogProduct[]> {
  const productIds = rows.map((row) => row.id);
  if (productIds.length === 0) return [];

  const [images, allVariantRows] = await Promise.all([
    loadPrimaryProductImages(productIds),
    getDb()
      .select()
      .from(productVariants)
      .where(
        and(
          inArray(productVariants.productId, productIds),
          sql`${productVariants.status} <> 'ARCHIVED'`,
        ),
      )
      .orderBy(asc(productVariants.sku)),
  ]);
  const variantRows = allVariantRows.filter(
    (variant): variant is typeof variant & { status: 'ACTIVE' | 'INQUIRY' } =>
      variant.status !== 'ARCHIVED',
  );
  const variantIds = variantRows.map((variant) => variant.id);
  const productTitlesById = new Map(
    rows.flatMap((product) => {
      const title =
        product.translations[locale]?.title ?? product.translations.hy?.title ?? product.sku;
      return title ? [[product.id, title] as const] : [];
    }),
  );
  const productTitles = new Map(
    variantRows.map((variant) => [
      variant.id,
      productTitlesById.get(variant.productId) ?? variant.sku,
    ]),
  );
  const [variantImages, prices] = await Promise.all([
    loadVariantImages(variantIds, locale, productTitles),
    resolveVariantPrices(
      variantRows.flatMap((variant) =>
        variant.priceAmount != null && variant.status === 'ACTIVE'
          ? [
              {
                id: variant.id,
                productId: variant.productId,
                priceAmount: variant.priceAmount,
                compareAtAmount: variant.compareAtAmount,
              },
            ]
          : [],
      ),
    ),
  ]);

  const variantsByProduct = new Map<string, ProductDetail['variants']>();
  const productsById = new Map(rows.map((product) => [product.id, product]));
  for (const variant of variantRows) {
    const resolved = prices.get(variant.id);
    const parent = productsById.get(variant.productId);
    const option = {
      id: variant.id,
      sku: variant.sku,
      itemType: variant.itemType,
      status: variant.status,
      priceAmount:
        variant.status === 'ACTIVE' && variant.priceAmount != null
          ? (resolved?.unitAmount ?? variant.priceAmount)
          : null,
      compareAtAmount: resolved?.compareAtAmount ?? null,
      discountPercent: resolved?.discountPercent ?? null,
      stockOnHand: variant.stockOnHand,
      leafWidthMm: variant.leafWidthMm,
      leafHeightMm: variant.leafHeightMm,
      leafThicknessMm: variant.leafThicknessMm,
      secondaryLeafWidthMm: variant.secondaryLeafWidthMm,
      unitWidthMm: variant.unitWidthMm,
      unitHeightMm: variant.unitHeightMm,
      frameDepthMm: variant.frameDepthMm,
      roughOpeningWidthMm: variant.roughOpeningWidthMm,
      roughOpeningHeightMm: variant.roughOpeningHeightMm,
      colorName: variant.colorName,
      finishName: variant.finishName,
      exteriorColorName: variant.exteriorColorName,
      exteriorFinishName: variant.exteriorFinishName,
      handing: variant.handing,
      swing: variant.swing,
      includedComponents: variant.includedComponents,
      images: variantImages.get(variant.id) ?? [],
      imageUrl: variantImages.get(variant.id)?.[0]?.url ?? null,
      purchasable:
        parent != null &&
        isVariantPurchasable({
          product: parent,
          variant,
        }),
    } satisfies ProductDetail['variants'][number];
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push(option);
    variantsByProduct.set(variant.productId, list);
  }

  return rows
    .map((product): CatalogProduct | null => {
      const variantOptions = variantsByProduct.get(product.id) ?? [];
      const base = toCatalogProduct(
        product,
        locale,
        images.get(product.id)?.url ?? null,
        variantOptions,
      );
      if (!base) return null;

      const pricedVariants = variantOptions
        .filter((variant) => variant.status === 'ACTIVE' && variant.priceAmount != null)
        .sort(
          (first, second) =>
            (first.priceAmount ?? Number.MAX_SAFE_INTEGER) -
            (second.priceAmount ?? Number.MAX_SAFE_INTEGER),
        );
      const lowest = pricedVariants[0];
      const sourceVariant = lowest ? variantRows.find((variant) => variant.id === lowest.id) : null;
      const resolved = sourceVariant ? prices.get(sourceVariant.id) : null;
      return {
        ...base,
        imageIsIllustrative: images.get(product.id)?.illustrative ?? false,
        listPriceAmount: resolved?.listAmount ?? lowest?.priceAmount ?? null,
        priceAmount: lowest?.priceAmount ?? null,
        compareAtAmount: lowest?.compareAtAmount ?? null,
        discountPercent: resolved?.discountPercent ?? null,
      } satisfies CatalogProduct;
    })
    .filter((product): product is CatalogProduct => product !== null);
}

async function loadVariantImages(
  variantIds: string[],
  locale: Locale,
  productTitles: Map<string, string>,
): Promise<Map<string, ProductGalleryImage[]>> {
  const map = new Map<string, ProductGalleryImage[]>();
  if (variantIds.length === 0) return map;

  const rows = await getDb()
    .select({
      id: mediaAssets.id,
      variantId: mediaAssets.variantId,
      secureUrl: mediaAssets.secureUrl,
      isPrimary: mediaAssets.isPrimary,
      sortOrder: mediaAssets.sortOrder,
      altTranslations: mediaAssets.altTranslations,
      sourceMetadata: mediaAssets.sourceMetadata,
    })
    .from(mediaAssets)
    .where(and(inArray(mediaAssets.variantId, variantIds), eq(mediaAssets.uploadStatus, 'READY')))
    .orderBy(desc(mediaAssets.isPrimary), asc(mediaAssets.sortOrder));

  for (const row of rows) {
    if (!row.variantId || !row.secureUrl) continue;
    const list = map.get(row.variantId) ?? [];
    list.push({
      id: row.id,
      url: row.secureUrl,
      alt: row.altTranslations?.[locale] ?? productTitles.get(row.variantId) ?? '',
      isPrimary: row.isPrimary,
      source: row.sourceMetadata
        ? {
            illustrative: row.sourceMetadata.kind === 'ILLUSTRATIVE_PEXELS',
            url: row.sourceMetadata.sourceUrl,
            photographer: row.sourceMetadata.photographer ?? null,
          }
        : undefined,
    });
    map.set(row.variantId, list);
  }
  return map;
}

const activeCatalogWhere = and(eq(products.status, 'ACTIVE'), isNull(products.deletedAt));

export async function getActiveCatalogCategories(locale: Locale): Promise<CatalogCategoryOption[]> {
  const rows = await getDb()
    .select({
      translations: categories.translations,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .where(and(eq(categories.status, 'ACTIVE'), isNull(categories.deletedAt)))
    .orderBy(asc(categories.sortOrder));

  return rows.flatMap((category) => {
    const translation = category.translations[locale];
    return translation ? [{ slug: translation.slug, title: translation.title }] : [];
  });
}

/** Active products by id — used by wishlist (not shared-cache; IDs are user-specific). */
export async function getActiveProductsByIds(
  locale: Locale,
  productIds: string[],
): Promise<CatalogProduct[]> {
  if (productIds.length === 0) {
    return [];
  }

  const rows = await getDb()
    .select()
    .from(products)
    .where(and(inArray(products.id, productIds), activeCatalogWhere));

  return withProductImages(rows, locale);
}

async function loadActiveProductsPage(
  locale: Locale,
  page: number,
  filters: CatalogFilters,
  rate: string,
): Promise<{ products: CatalogProduct[]; total: number; pageSize: number }> {
  const offset = (page - 1) * filters.pageSize;
  const catalogWhere = and(
    activeCatalogWhere,
    filters.q
      ? sql`(
          strpos(
            lower(coalesce(
              ${products.translations}->${locale}->>'title',
              ${products.translations}->'hy'->>'title',
              ''
            )),
            lower(${filters.q})
          ) > 0
          OR strpos(lower(${products.sku}), lower(${filters.q})) > 0
        )`
      : undefined,
    filters.category
      ? exists(
          getDb()
            .select({ id: categories.id })
            .from(productCategories)
            .innerJoin(categories, eq(productCategories.categoryId, categories.id))
            .where(
              and(
                eq(productCategories.productId, products.id),
                eq(categories.status, 'ACTIVE'),
                isNull(categories.deletedAt),
                sql`${categories.translations}->${locale}->>'slug' = ${filters.category}`,
              ),
            ),
        )
      : undefined,
  );
  const needsVariantMatch = catalogFiltersNeedVariantMatch(filters);
  const needsFullScan =
    needsVariantMatch ||
    filters.sort === 'price_asc' ||
    filters.sort === 'price_desc' ||
    filters.sort === 'popular';

  if (needsFullScan) {
    const rows = await getDb()
      .select()
      .from(products)
      .where(catalogWhere)
      .orderBy(desc(products.createdAt));
    const enriched = await withProductImages(rows, locale);
    const matchingProducts = enriched.flatMap((product) => {
      const matchedVariant = getMatchingCatalogVariant(product, filters, rate);
      if (needsVariantMatch && !matchedVariant) return [];
      if (!matchedVariant) return [product];
      return [
        {
          ...product,
          listPriceAmount: matchedVariant.compareAtAmount ?? matchedVariant.priceAmount,
          priceAmount: matchedVariant.priceAmount,
          compareAtAmount: matchedVariant.compareAtAmount,
          discountPercent: matchedVariant.discountPercent ?? null,
        },
      ];
    });

    const newestPosition = new Map(rows.map((row, index) => [row.id, index] as const));
    const popularity = new Map<string, number>();
    if (filters.sort === 'popular' && rows.length > 0) {
      const productIds = rows.map((row) => row.id);
      const popularityRows = await getDb()
        .select({
          productId: productVariants.productId,
          quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        })
        .from(orderItems)
        .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(inArray(productVariants.productId, productIds), ne(orders.status, 'CANCELLED')))
        .groupBy(productVariants.productId);
      for (const row of popularityRows) {
        popularity.set(row.productId, row.quantity);
      }
    }

    matchingProducts.sort((first, second) => {
      if (filters.sort === 'price_asc' || filters.sort === 'price_desc') {
        const firstPrice = first.priceAmount ?? Number.MAX_SAFE_INTEGER;
        const secondPrice = second.priceAmount ?? Number.MAX_SAFE_INTEGER;
        const difference = firstPrice - secondPrice;
        if (difference !== 0) {
          return filters.sort === 'price_asc' ? difference : -difference;
        }
      } else if (filters.sort === 'popular') {
        const difference = (popularity.get(second.id) ?? 0) - (popularity.get(first.id) ?? 0);
        if (difference !== 0) return difference;
      }
      return (
        (newestPosition.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
        (newestPosition.get(second.id) ?? Number.MAX_SAFE_INTEGER)
      );
    });

    return {
      products: matchingProducts.slice(offset, offset + filters.pageSize),
      total: matchingProducts.length,
      pageSize: filters.pageSize,
    };
  }

  const [[countRow], rows] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(catalogWhere),
    getDb()
      .select()
      .from(products)
      .where(catalogWhere)
      .orderBy(desc(products.createdAt))
      .limit(filters.pageSize)
      .offset(offset),
  ]);

  const enriched = await withProductImages(rows, locale);

  return {
    products: enriched,
    total: countRow?.count ?? 0,
    pageSize: filters.pageSize,
  };
}

/** Paginated active catalog for the storefront (tag-cached). */
export async function getActiveProductsPage(
  locale: Locale,
  page: number,
  filters: CatalogFilters = defaultCatalogFilters,
  rate = '1',
): Promise<{ products: CatalogProduct[]; total: number; pageSize: number }> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeFilters = {
    ...filters,
    page: safePage,
  };

  return unstable_cache(
    async () => loadActiveProductsPage(locale, safePage, safeFilters, rate),
    [getDatabaseCacheScope(), 'active-products-page', locale, JSON.stringify(safeFilters), rate],
    {
      tags: [CACHE_TAGS.products],
      revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    },
  )();
}

/** @deprecated Prefer getActiveProductsPage — kept for narrow internal callers. */
export async function getActiveProducts(locale: Locale): Promise<CatalogProduct[]> {
  const result = await getActiveProductsPage(locale, 1);
  if (result.total <= result.pageSize) {
    return result.products;
  }

  const rows = await getDb().select().from(products).where(activeCatalogWhere);
  return withProductImages(rows, locale);
}

async function loadFeaturedProducts(locale: Locale): Promise<CatalogProduct[]> {
  const rows = await getDb()
    .select()
    .from(products)
    .where(
      and(eq(products.status, 'ACTIVE'), eq(products.isFeatured, true), isNull(products.deletedAt)),
    )
    .limit(8);

  return withProductImages(rows, locale);
}

export async function getFeaturedProducts(locale: Locale): Promise<CatalogProduct[]> {
  return unstable_cache(
    async () => loadFeaturedProducts(locale),
    [getDatabaseCacheScope(), 'featured-products', locale],
    {
      tags: [CACHE_TAGS.products],
      revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    },
  )();
}

export async function getProductBySlug(
  locale: Locale,
  slug: string,
): Promise<CatalogProduct | null> {
  const [product] = await getDb()
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, 'ACTIVE'),
        isNull(products.deletedAt),
        sql`${products.translations}->${locale}->>'slug' = ${slug}`,
      ),
    )
    .limit(1);

  if (!product) {
    return null;
  }

  const [enriched] = await withProductImages([product], locale);
  return enriched ?? null;
}

async function loadProductGallery(
  productId: string,
  locale: Locale,
  fallbackTitle: string,
): Promise<ProductGalleryImage[]> {
  const rows = await getDb()
    .select({
      id: mediaAssets.id,
      secureUrl: mediaAssets.secureUrl,
      isPrimary: mediaAssets.isPrimary,
      sortOrder: mediaAssets.sortOrder,
      altTranslations: mediaAssets.altTranslations,
      sourceMetadata: mediaAssets.sourceMetadata,
    })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.productId, productId), eq(mediaAssets.uploadStatus, 'READY')))
    .orderBy(asc(mediaAssets.sortOrder));

  return rows
    .flatMap((row) =>
      row.secureUrl
        ? [
            {
              id: row.id,
              url: row.secureUrl,
              alt: row.altTranslations?.[locale] ?? fallbackTitle,
              isPrimary: row.isPrimary,
              source: row.sourceMetadata
                ? {
                    illustrative: row.sourceMetadata.kind === 'ILLUSTRATIVE_PEXELS',
                    url: row.sourceMetadata.sourceUrl,
                    photographer: row.sourceMetadata.photographer ?? null,
                  }
                : undefined,
            },
          ]
        : [],
    )
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

async function loadProductCategories(
  productId: string,
  locale: Locale,
): Promise<ProductCategoryRef[]> {
  const rows = await getDb()
    .select({
      id: categories.id,
      translations: categories.translations,
      isPrimary: productCategories.isPrimary,
      sortOrder: productCategories.sortOrder,
    })
    .from(productCategories)
    .innerJoin(categories, eq(productCategories.categoryId, categories.id))
    .where(
      and(
        eq(productCategories.productId, productId),
        eq(categories.status, 'ACTIVE'),
        isNull(categories.deletedAt),
      ),
    )
    .orderBy(asc(productCategories.sortOrder));

  return rows
    .map((row) => {
      const translation = row.translations[locale] ?? row.translations.hy;
      if (!translation) return null;
      return {
        id: row.id,
        title: translation.title,
        slug: translation.slug,
      } satisfies ProductCategoryRef;
    })
    .filter((row): row is ProductCategoryRef => row !== null);
}

async function loadProductDetailBySlug(
  locale: Locale,
  slug: string,
): Promise<ProductDetail | null> {
  const product = await getProductBySlug(locale, slug);
  if (!product) {
    return null;
  }

  const [images, productCats] = await Promise.all([
    loadProductGallery(product.id, locale, product.translation.title),
    loadProductCategories(product.id, locale),
  ]);

  const gallery =
    images.length > 0
      ? images
      : product.imageUrl
        ? [
            {
              id: product.id,
              url: product.imageUrl,
              alt: product.translation.title,
              isPrimary: true,
            },
          ]
        : [];

  return {
    ...product,
    images: gallery,
    categories: productCats,
  };
}

/** Full PDP payload — request-deduped; tagged per-slug so edits don't bust other PDPs. */
export const getProductDetailBySlug = cache(
  async (locale: Locale, slug: string): Promise<ProductDetail | null> => {
    return unstable_cache(
      async () => loadProductDetailBySlug(locale, slug),
      [getDatabaseCacheScope(), 'product-detail', locale, slug],
      {
        tags: [CACHE_TAGS.productDetail, CACHE_TAGS.productSlug(locale, slug)],
        revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
      },
    )();
  },
);

/** Active products sharing at least one category with the given product. */
export async function getRelatedProducts(
  locale: Locale,
  productId: string,
): Promise<CatalogProduct[]> {
  const seedCategories = getDb()
    .select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, productId));

  const relatedLinks = await getDb()
    .selectDistinct({ productId: productCategories.productId })
    .from(productCategories)
    .where(
      and(
        inArray(productCategories.categoryId, seedCategories),
        sql`${productCategories.productId} <> ${productId}`,
      ),
    );

  const relatedIds = relatedLinks.map((row) => row.productId);
  if (relatedIds.length === 0) {
    return [];
  }

  const rows = await getDb()
    .select()
    .from(products)
    .where(and(inArray(products.id, relatedIds), activeCatalogWhere))
    .limit(RELATED_PRODUCTS_LIMIT);

  return withProductImages(rows, locale);
}
