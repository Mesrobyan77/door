import "server-only";

import { and, countDistinct, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  categories,
  orderItems,
  orders,
  productCategories,
  type TranslationsJson,
} from "@/db/schema";
import type { OrderStatus } from "@/features/orders/domain/order-status";
import type { Locale } from "@/lib/i18n/config";
import { mediaPublicUrl } from "@/lib/media/public-url";

export type AnalyticsTopProduct = {
  productId: string;
  title: string;
  sku: string;
  imageUrl: string | null;
  quantitySold: number;
  orderCount: number;
  revenueAmount: number;
  unitPriceAmount: number;
};

export type AnalyticsTopCategory = {
  categoryId: string;
  title: string;
  itemCount: number;
  orderCount: number;
  revenueAmount: number;
};

function categoryTitle(translations: TranslationsJson, locale: Locale): string {
  return (
    translations[locale]?.title ??
    translations.hy?.title ??
    translations.en?.title ??
    translations.ru?.title ??
    "Untitled category"
  );
}

/** Top products by units sold in the analytics window. */
export async function queryTopSellingProducts(input: {
  start: Date;
  end: Date;
  revenueStatuses: OrderStatus[];
  limit?: number;
}): Promise<AnalyticsTopProduct[]> {
  const limit = input.limit ?? 5;
  const rows = await getDb()
    .select({
      productId: orderItems.productId,
      title: orderItems.productTitleSnapshot,
      sku: orderItems.productSkuSnapshot,
      imageKey: orderItems.productImageKeySnapshot,
      quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`.mapWith(
        Number,
      ),
      orderCount: countDistinct(orderItems.orderId),
      revenueAmount: sql<number>`coalesce(sum(${orderItems.lineTotalAmount}), 0)`.mapWith(
        Number,
      ),
      unitPriceAmount: sql<number>`coalesce(max(${orderItems.unitBaseAmount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.isArchived, false),
        gte(orders.placedAt, input.start),
        lte(orders.placedAt, input.end),
        inArray(orders.status, input.revenueStatuses),
      ),
    )
    .groupBy(
      orderItems.productId,
      orderItems.productTitleSnapshot,
      orderItems.productSkuSnapshot,
      orderItems.productImageKeySnapshot,
    )
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);

  return rows.map((row) => ({
    productId: row.productId ?? `sku:${row.sku}`,
    title: row.title,
    sku: row.sku,
    imageUrl: row.imageKey ? mediaPublicUrl(row.imageKey) : null,
    quantitySold: row.quantitySold,
    orderCount: row.orderCount,
    revenueAmount: row.revenueAmount,
    unitPriceAmount: row.unitPriceAmount,
  }));
}

/** Top categories by line revenue in the analytics window. */
export async function queryTopCategories(input: {
  start: Date;
  end: Date;
  revenueStatuses: OrderStatus[];
  locale: Locale;
  limit?: number;
}): Promise<AnalyticsTopCategory[]> {
  const limit = input.limit ?? 5;
  const rows = await getDb()
    .select({
      categoryId: categories.id,
      translations: categories.translations,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`.mapWith(
        Number,
      ),
      orderCount: countDistinct(orders.id),
      revenueAmount: sql<number>`coalesce(sum(${orderItems.lineTotalAmount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(
      productCategories,
      eq(productCategories.productId, orderItems.productId),
    )
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(
      and(
        eq(orders.isArchived, false),
        gte(orders.placedAt, input.start),
        lte(orders.placedAt, input.end),
        inArray(orders.status, input.revenueStatuses),
      ),
    )
    .groupBy(categories.id, categories.translations)
    .orderBy(desc(sql`sum(${orderItems.lineTotalAmount})`))
    .limit(limit);

  return rows.map((row) => ({
    categoryId: row.categoryId,
    title: categoryTitle(row.translations, input.locale),
    itemCount: row.itemCount,
    orderCount: row.orderCount,
    revenueAmount: row.revenueAmount,
  }));
}
