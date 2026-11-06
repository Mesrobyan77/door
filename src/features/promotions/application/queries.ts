import 'server-only';

import { and, asc, count, desc, eq, ilike, inArray, type SQL } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { categories, productVariants, products, promotions } from '@/db/schema';
import type { AdminPromotionsFilter } from '@/features/promotions/schemas/admin-promotions';

const PAGE_SIZE = 20;

export type AdminPromotionListItem = {
  id: string;
  kind: string;
  code: string | null;
  discountType: string;
  discountValue: number;
  totalUsageLimit: number | null;
  isActive: boolean;
  usedCount: number;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
  productId: string | null;
  productVariantId: string | null;
  categoryId: string | null;
};

/** Lists promotions for the admin coupons/discounts surface. */
export async function listAdminPromotions(filters: AdminPromotionsFilter): Promise<{
  rows: AdminPromotionListItem[];
  total: number;
  pageSize: number;
}> {
  const conditions: SQL[] = [];

  if (filters.kind) {
    conditions.push(eq(promotions.kind, filters.kind));
  }

  if (filters.active === 'true') {
    conditions.push(eq(promotions.isActive, true));
  } else if (filters.active === 'false') {
    conditions.push(eq(promotions.isActive, false));
  }

  if (filters.q) {
    conditions.push(ilike(promotions.code, `%${filters.q}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (filters.page - 1) * PAGE_SIZE;

  const [rows, [totalRow]] = await Promise.all([
    getDb()
      .select({
        id: promotions.id,
        kind: promotions.kind,
        code: promotions.code,
        discountType: promotions.discountType,
        discountValue: promotions.discountValue,
        totalUsageLimit: promotions.totalUsageLimit,
        isActive: promotions.isActive,
        usedCount: promotions.usedCount,
        priority: promotions.priority,
        startsAt: promotions.startsAt,
        endsAt: promotions.endsAt,
        productId: promotions.productId,
        productVariantId: promotions.productVariantId,
        categoryId: promotions.categoryId,
      })
      .from(promotions)
      .where(where)
      .orderBy(desc(promotions.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    getDb().select({ value: count() }).from(promotions).where(where),
  ]);

  return {
    rows,
    total: totalRow?.value ?? 0,
    pageSize: PAGE_SIZE,
  };
}

/** Loads one promotion by id for the admin editor. */
export async function getAdminPromotionById(id: string) {
  const [row] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);

  return row ?? null;
}

/** Product/category options for automatic discount targeting. */
export async function listPromotionTargetOptions(): Promise<{
  products: Array<{ id: string; sku: string | null; title: string }>;
  variants: Array<{ id: string; sku: string; productTitle: string }>;
  categories: Array<{ id: string; title: string }>;
}> {
  const [productRows, categoryRows] = await Promise.all([
    getDb()
      .select({
        id: products.id,
        sku: products.sku,
        translations: products.translations,
      })
      .from(products)
      .orderBy(asc(products.sku))
      .limit(200),
    getDb()
      .select({
        id: categories.id,
        translations: categories.translations,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder))
      .limit(200),
  ]);

  const variantRows =
    productRows.length === 0
      ? []
      : await getDb()
          .select({
            id: productVariants.id,
            productId: productVariants.productId,
            sku: productVariants.sku,
          })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.status, 'ACTIVE'),
              inArray(
                productVariants.productId,
                productRows.map((product) => product.id),
              ),
            ),
          )
          .orderBy(asc(productVariants.sku));
  const skuByProduct = new Map<string, string>();
  const productTitleById = new Map(
    productRows.map((product) => [
      product.id,
      product.translations.en?.title ?? product.translations.hy?.title ?? product.sku ?? product.id,
    ]),
  );
  for (const variant of variantRows) {
    if (!skuByProduct.has(variant.productId)) {
      skuByProduct.set(variant.productId, variant.sku);
    }
  }

  return {
    products: productRows.map((product) => ({
      id: product.id,
      sku: skuByProduct.get(product.id) ?? product.sku,
      title:
        product.translations.en?.title ??
        product.translations.hy?.title ??
        skuByProduct.get(product.id) ??
        product.sku ??
        product.id,
    })),
    variants: variantRows.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      productTitle: productTitleById.get(variant.productId) ?? variant.productId,
    })),
    categories: categoryRows.map((category) => ({
      id: category.id,
      title: category.translations.en?.title ?? category.translations.hy?.title ?? category.id,
    })),
  };
}
