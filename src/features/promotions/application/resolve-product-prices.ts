import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { productCategories, promotions } from "@/db/schema";
import {
  resolveCatalogPrice,
  type ResolvedCatalogPrice,
} from "@/features/promotions/domain/resolve-automatic-discount";
import { getStoreGlobalDiscount } from "@/features/settings/application/queries";

export type ProductPriceInput = {
  id: string;
  priceAmount: number;
  compareAtAmount?: number | null;
};

type AutomaticPromoRow = {
  discountValue: number;
  productId: string | null;
  categoryId: string | null;
};

/**
 * Batch-resolves catalog unit prices with automatic discounts applied.
 * Used by storefront listing, PDP, cart, and checkout.
 */
export async function resolveProductPrices(
  products: ProductPriceInput[],
): Promise<Map<string, ResolvedCatalogPrice>> {
  const result = new Map<string, ResolvedCatalogPrice>();
  if (products.length === 0) {
    return result;
  }

  const productIds = products.map((product) => product.id);
  const [globalDiscount, promoRows, categoryLinks] = await Promise.all([
    getStoreGlobalDiscount(),
    getDb()
      .select({
        discountValue: promotions.discountValue,
        productId: promotions.productId,
        categoryId: promotions.categoryId,
      })
      .from(promotions)
      .where(
        and(
          eq(promotions.kind, "AUTOMATIC"),
          eq(promotions.discountType, "PERCENTAGE"),
          eq(promotions.isActive, true),
        ),
      ),
    getDb()
      .select({
        productId: productCategories.productId,
        categoryId: productCategories.categoryId,
      })
      .from(productCategories)
      .where(inArray(productCategories.productId, productIds)),
  ]);

  const productPercent = new Map<string, number>();
  const categoryPercent = new Map<string, number>();
  for (const promo of promoRows as AutomaticPromoRow[]) {
    if (promo.productId) {
      const current = productPercent.get(promo.productId);
      if (current == null || promo.discountValue > current) {
        productPercent.set(promo.productId, promo.discountValue);
      }
    }
    if (promo.categoryId) {
      const current = categoryPercent.get(promo.categoryId);
      if (current == null || promo.discountValue > current) {
        categoryPercent.set(promo.categoryId, promo.discountValue);
      }
    }
  }

  const categoriesByProduct = new Map<string, string[]>();
  for (const link of categoryLinks) {
    const list = categoriesByProduct.get(link.productId) ?? [];
    list.push(link.categoryId);
    categoriesByProduct.set(link.productId, list);
  }

  for (const product of products) {
    const categoryIds = categoriesByProduct.get(product.id) ?? [];
    const categoryPercents = categoryIds.map(
      (categoryId) => categoryPercent.get(categoryId) ?? null,
    );

    result.set(
      product.id,
      resolveCatalogPrice({
        listAmount: product.priceAmount,
        productPercent: productPercent.get(product.id) ?? null,
        categoryPercents,
        globalPercent: globalDiscount.percentage,
        manualCompareAtAmount: product.compareAtAmount ?? null,
      }),
    );
  }

  return result;
}

/** Resolves one product price (convenience wrapper). */
export async function resolveProductPrice(
  product: ProductPriceInput,
): Promise<ResolvedCatalogPrice> {
  const map = await resolveProductPrices([product]);
  return (
    map.get(product.id) ??
    resolveCatalogPrice({
      listAmount: product.priceAmount,
      manualCompareAtAmount: product.compareAtAmount ?? null,
    })
  );
}
