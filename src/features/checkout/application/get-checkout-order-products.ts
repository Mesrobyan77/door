import "server-only";

import { and, asc, eq, inArray, or } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  cartItems,
  mediaAssets,
  productVariants,
  products,
} from "@/db/schema";
import type { CheckoutOrderProduct } from "@/features/checkout/ui/checkout-order-product";
import { formatVariantConfiguration } from "@/features/products/domain/format-variant-configuration";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export type { CheckoutOrderProduct };

type CartItemWithProduct = {
  item: typeof cartItems.$inferSelect;
  product: typeof products.$inferSelect;
  variant: typeof productVariants.$inferSelect;
};

async function loadPrimaryProductImages(
  productIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (productIds.length === 0) {
    return map;
  }

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
    if (!row.productId || !row.secureUrl || map.has(row.productId)) {
      continue;
    }
    map.set(row.productId, row.secureUrl);
  }

  return map;
}

async function loadPrimaryVariantImages(
  variantIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (variantIds.length === 0) return map;

  const rows = await getDb()
    .select({
      variantId: mediaAssets.variantId,
      secureUrl: mediaAssets.secureUrl,
    })
    .from(mediaAssets)
    .where(
      and(
        inArray(mediaAssets.variantId, variantIds),
        eq(mediaAssets.uploadStatus, "READY"),
        or(eq(mediaAssets.isPrimary, true), eq(mediaAssets.role, "PRIMARY")),
      ),
    )
    .orderBy(asc(mediaAssets.sortOrder));

  for (const row of rows) {
    if (!row.variantId || !row.secureUrl || map.has(row.variantId)) continue;
    map.set(row.variantId, row.secureUrl);
  }
  return map;
}

/** Builds checkout “products in your order” display rows from cart lines. */
export async function getCheckoutOrderProducts(
  locale: Locale,
  rows: CartItemWithProduct[],
): Promise<CheckoutOrderProduct[]> {
  const variantLabels = getDictionary(locale).product.variant;
  const [images, variantImages] = await Promise.all([
    loadPrimaryProductImages(rows.map(({ product }) => product.id)),
    loadPrimaryVariantImages(rows.map(({ variant }) => variant.id)),
  ]);

  return rows.map(({ item, product, variant }) => {
    const translation =
      product.translations[locale] ?? product.translations.hy;
    return {
      id: item.id,
      title: translation?.title ?? product.sku,
      configuration: formatVariantConfiguration(variant, variantLabels),
      quantity: item.quantity,
      imageUrl: variantImages.get(variant.id) ?? images.get(product.id) ?? null,
    };
  });
}
