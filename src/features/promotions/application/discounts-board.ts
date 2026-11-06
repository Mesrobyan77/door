import "server-only";

import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  mediaAssets,
  productVariants,
  products,
  promotions,
} from "@/db/schema";
import { listAdminCategories } from "@/features/categories/application/list-admin-categories";
import { getStoreGlobalDiscount } from "@/features/settings/application/queries";
import type { Locale } from "@/lib/i18n/config";

export type DiscountBoardCategory = {
  id: string;
  title: string;
  parentLabel: string;
  discountPercent: number | null;
  promotionId: string | null;
};

export type DiscountBoardProduct = {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  priceAmount: number | null;
  imageUrl: string | null;
  discountPercent: number | null;
  promotionId: string | null;
};

export type AdminDiscountsBoard = {
  globalPercent: number | null;
  categories: DiscountBoardCategory[];
  products: DiscountBoardProduct[];
};

type AutomaticTargetPromo = {
  id: string;
  discountValue: number;
  productId: string | null;
  categoryId: string | null;
};

/** Loads the admin discounts board: global %, categories, and products. */
export async function getAdminDiscountsBoard(
  locale: Locale,
): Promise<AdminDiscountsBoard> {
  const [globalDiscount, categoryRows, productRows, promoRows, imageRows, variantRows] =
    await Promise.all([
      getStoreGlobalDiscount(),
      listAdminCategories(locale),
      getDb()
        .select({
          id: products.id,
          translations: products.translations,
        })
        .from(products)
        .where(isNull(products.deletedAt))
        .orderBy(asc(products.id))
        .limit(300),
      getDb()
        .select({
          id: promotions.id,
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
        )
        .orderBy(desc(promotions.updatedAt)),
      getDb()
        .select({
          productId: mediaAssets.productId,
          secureUrl: mediaAssets.secureUrl,
        })
        .from(mediaAssets)
        .where(
          and(
            isNotNull(mediaAssets.productId),
            eq(mediaAssets.uploadStatus, "READY"),
            eq(mediaAssets.isPrimary, true),
          ),
        ),
      getDb()
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          sku: productVariants.sku,
          priceAmount: productVariants.priceAmount,
        })
        .from(productVariants)
        .where(eq(productVariants.status, "ACTIVE"))
        .orderBy(asc(productVariants.priceAmount)),
    ]);

  const byProduct = new Map<string, AutomaticTargetPromo>();
  const byCategory = new Map<string, AutomaticTargetPromo>();
  for (const promo of promoRows) {
    if (promo.productId && !byProduct.has(promo.productId)) {
      byProduct.set(promo.productId, promo);
    }
    if (promo.categoryId && !byCategory.has(promo.categoryId)) {
      byCategory.set(promo.categoryId, promo);
    }
  }

  const images = new Map<string, string>();
  for (const row of imageRows) {
    if (!row.productId || !row.secureUrl || images.has(row.productId)) continue;
    images.set(row.productId, row.secureUrl);
  }

  const variantsByProduct = new Map<
    string,
    (typeof variantRows)[number]
  >();
  for (const variant of variantRows) {
    if (variant.priceAmount == null || variantsByProduct.has(variant.productId)) {
      continue;
    }
    variantsByProduct.set(variant.productId, variant);
  }

  return {
    globalPercent: globalDiscount.percentage,
    categories: categoryRows.map((category) => {
      const promo = byCategory.get(category.id);
      return {
        id: category.id,
        title: category.title,
        parentLabel: category.parentTitle ?? "Root Category",
        discountPercent: promo?.discountValue ?? null,
        promotionId: promo?.id ?? null,
      };
    }),
    products: productRows.map((product) => {
      const translation =
        product.translations[locale] ??
        product.translations.hy ??
        product.translations.en;
      const promo = byProduct.get(product.id);
      const variant = variantsByProduct.get(product.id);
      return {
        id: product.id,
        title: translation?.title ?? variant?.sku ?? product.id,
        slug: translation?.slug ?? "",
        sku: variant?.sku ?? null,
        priceAmount: variant?.priceAmount ?? null,
        imageUrl: images.get(product.id) ?? null,
        discountPercent: promo?.discountValue ?? null,
        promotionId: promo?.id ?? null,
      };
    }),
  };
}
