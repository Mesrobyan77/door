import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  categories,
  mediaAssets,
  productCategories,
  productVariants,
  products,
  type PerformanceSpecifications,
  type LocaleTranslation,
} from "@/db/schema";
import { loadProductImagesForAdmin } from "@/features/products/application/persist-product-media";
import type { AdminProductsFilter } from "@/features/products/schemas/admin-list";
import type { Locale } from "@/lib/i18n/config";

const PAGE_SIZE = 20;

export type AdminProductImage = {
  id: string;
  url: string;
  isPrimary: boolean;
};

export type AdminProductListItem = {
  id: string;
  sku: string;
  status: string;
  priceAmount: number | null;
  compareAtAmount: number | null;
  stockOnHand: number;
  isFeatured: boolean;
  createdAt: Date;
  title: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  categoryIds: string[];
  categoryLabels: string[];
  images: AdminProductImage[];
  doorClassification: "INTERIOR" | "ENTRANCE" | null;
  entranceEnvironments: ("APARTMENT" | "OUTDOOR_HOUSE")[] | null;
  brandName: string | null;
  modelName: string | null;
  collectionName: string | null;
  structuralMaterial: string | null;
  coreMaterial: string | null;
  surfaceCoating: string | null;
  hasGlazing: boolean | null;
  glazingType: string | null;
  manufacturer: string | null;
  countryOfManufacture: string | null;
  openingMechanism: "HINGED" | "SLIDING" | "FOLDING" | null;
  frameSystem: "STANDARD" | "CONCEALED" | null;
  leafConfiguration: "SINGLE" | "DOUBLE" | "UNEQUAL_DOUBLE" | null;
  performanceSpecifications: PerformanceSpecifications | null;
  variants: Array<typeof productVariants.$inferSelect>;
};

export type AdminCategoryOption = {
  id: string;
  title: string;
};

function translationFor(
  translations: (typeof products.$inferSelect)["translations"],
  locale: Locale,
): LocaleTranslation | null {
  return translations[locale] ?? translations.hy ?? translations.en ?? null;
}

function buildWhere(filters: AdminProductsFilter, locale: Locale): SQL | undefined {
  const conditions: SQL[] = [isNull(products.deletedAt)];

  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        sql`${products.translations}->${locale}->>'title' ILIKE ${pattern}`,
        sql`${products.translations}->${locale}->>'slug' ILIKE ${pattern}`,
        sql`${products.translations}->'hy'->>'title' ILIKE ${pattern}`,
        sql`${products.translations}->'hy'->>'slug' ILIKE ${pattern}`,
      )!,
    );
  }

  if (filters.sku) {
    conditions.push(sql`exists (
      select 1 from ${productVariants}
      where ${productVariants.productId} = ${products.id}
        and ${productVariants.sku} ILIKE ${`%${filters.sku}%`}
    )`);
  }

  if (filters.stock === "in_stock") {
    conditions.push(sql`exists (
      select 1 from ${productVariants}
      where ${productVariants.productId} = ${products.id}
        and ${productVariants.status} = 'ACTIVE'
        and ${productVariants.stockOnHand} > 0
    )`);
  } else if (filters.stock === "out_of_stock") {
    conditions.push(sql`not exists (
      select 1 from ${productVariants}
      where ${productVariants.productId} = ${products.id}
        and ${productVariants.status} = 'ACTIVE'
        and ${productVariants.stockOnHand} > 0
    )`);
  } else if (filters.stock === "low_stock") {
    conditions.push(sql`exists (
      select 1 from ${productVariants}
      where ${productVariants.productId} = ${products.id}
        and ${productVariants.status} = 'ACTIVE'
        and ${productVariants.stockOnHand} > 0
        and ${productVariants.stockOnHand} <= ${productVariants.lowStockThreshold}
    )`);
  }

  if (filters.categoryId) {
    conditions.push(
      sql`exists (
        select 1 from ${productCategories}
        where ${productCategories.productId} = ${products.id}
          and ${productCategories.categoryId} = ${filters.categoryId}
      )`,
    );
  }

  return and(...conditions);
}

function orderByClause(filters: AdminProductsFilter, locale: Locale) {
  const direction = filters.dir === "asc" ? asc : desc;
  switch (filters.sort) {
    case "stock":
      return direction(sql`(
        select coalesce(sum(${productVariants.stockOnHand}), 0)
        from ${productVariants}
        where ${productVariants.productId} = ${products.id}
          and ${productVariants.status} = 'ACTIVE'
      )`);
    case "price":
      return direction(sql`(
        select min(${productVariants.priceAmount})
        from ${productVariants}
        where ${productVariants.productId} = ${products.id}
          and ${productVariants.status} = 'ACTIVE'
          and ${productVariants.priceAmount} is not null
      )`);
    case "title":
      return direction(
        sql`${products.translations}->${locale}->>'title'`,
      );
    case "created":
    default:
      return direction(products.createdAt);
  }
}

async function loadPrimaryImages(
  productIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (productIds.length === 0) return map;

  const rows = await getDb()
    .select({
      productId: mediaAssets.productId,
      secureUrl: mediaAssets.secureUrl,
    })
    .from(mediaAssets)
    .where(
      and(
        inArray(mediaAssets.productId, productIds),
        eq(mediaAssets.uploadStatus, "READY"),
        or(eq(mediaAssets.isPrimary, true), eq(mediaAssets.role, "PRIMARY")),
      ),
    )
    .orderBy(asc(mediaAssets.sortOrder));

  for (const row of rows) {
    if (!row.productId || !row.secureUrl || map.has(row.productId)) continue;
    map.set(row.productId, row.secureUrl);
  }
  return map;
}

async function loadCategoryMeta(
  productIds: string[],
  locale: Locale,
): Promise<Map<string, { ids: string[]; labels: string[] }>> {
  const map = new Map<string, { ids: string[]; labels: string[] }>();
  if (productIds.length === 0) return map;

  const rows = await getDb()
    .select({
      productId: productCategories.productId,
      categoryId: productCategories.categoryId,
      translations: categories.translations,
      sortOrder: productCategories.sortOrder,
    })
    .from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(inArray(productCategories.productId, productIds))
    .orderBy(asc(productCategories.sortOrder));

  for (const row of rows) {
    const title =
      translationFor(row.translations, locale)?.title ??
      row.translations.hy?.title ??
      "Category";
    const entry = map.get(row.productId) ?? { ids: [], labels: [] };
    entry.ids.push(row.categoryId);
    entry.labels.push(title);
    map.set(row.productId, entry);
  }
  return map;
}

/** Lists products for the admin catalog table with filters and sort. */
export async function listAdminProducts(
  locale: Locale,
  filters: AdminProductsFilter,
): Promise<{ rows: AdminProductListItem[]; total: number; pageSize: number }> {
  const where = buildWhere(filters, locale);
  const db = getDb();

  const [totalRow] = await db
    .select({ value: count() })
    .from(products)
    .where(where);

  const total = totalRow?.value ?? 0;
  const offset = (filters.page - 1) * PAGE_SIZE;

  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(orderByClause(filters, locale))
    .limit(PAGE_SIZE)
    .offset(offset);

  const ids = rows.map((row) => row.id);
  const [primaryImages, categoryMap, galleryImages, variants] = await Promise.all([
    loadPrimaryImages(ids),
    loadCategoryMeta(ids, locale),
    loadProductImagesForAdmin(ids),
    ids.length === 0
      ? Promise.resolve([])
      : db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.productId, ids))
          .orderBy(asc(productVariants.createdAt)),
  ]);
  const variantsByProduct = new Map<string, typeof variants>();
  for (const variant of variants) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.productId, list);
  }

  return {
    total,
    pageSize: PAGE_SIZE,
    rows: rows.map((product) => {
      const translation = translationFor(product.translations, locale);
      const categoryMeta = categoryMap.get(product.id);
      const productVariantRows = variantsByProduct.get(product.id) ?? [];
      const pricedVariants = productVariantRows
        .filter(
          (variant) =>
            variant.status === "ACTIVE" && variant.priceAmount != null,
        )
        .sort(
          (first, second) =>
            (first.priceAmount ?? Number.MAX_SAFE_INTEGER) -
            (second.priceAmount ?? Number.MAX_SAFE_INTEGER),
        );
      const priceVariant = pricedVariants[0];
      return {
        id: product.id,
        sku: productVariantRows[0]?.sku ?? product.sku,
        status: product.status,
        priceAmount: priceVariant?.priceAmount ?? null,
        compareAtAmount: priceVariant?.compareAtAmount ?? null,
        stockOnHand: productVariantRows.reduce(
          (total, variant) =>
            total +
            (variant.status === "ACTIVE" ? variant.stockOnHand : 0),
          0,
        ),
        isFeatured: product.isFeatured,
        createdAt: product.createdAt,
        title: translation?.title ?? product.sku,
        slug: translation?.slug ?? "",
        description: translation?.description ?? "",
        imageUrl: primaryImages.get(product.id) ?? null,
        categoryIds: categoryMeta?.ids ?? [],
        categoryLabels: categoryMeta?.labels ?? [],
        images: galleryImages.get(product.id) ?? [],
        doorClassification: product.doorClassification,
        entranceEnvironments: product.entranceEnvironments,
        brandName: product.brandName,
        modelName: product.modelName,
        collectionName: product.collectionName,
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
        variants: productVariantRows,
      };
    }),
  };
}

/** Active categories for the admin products filter dropdown. */
export async function listAdminCategoryOptions(
  locale: Locale,
): Promise<AdminCategoryOption[]> {
  const rows = await getDb()
    .select()
    .from(categories)
    .where(and(eq(categories.status, "ACTIVE"), isNull(categories.deletedAt)))
    .orderBy(asc(categories.sortOrder));

  return rows.map((row) => ({
    id: row.id,
    title: translationFor(row.translations, locale)?.title ?? "Category",
  }));
}
