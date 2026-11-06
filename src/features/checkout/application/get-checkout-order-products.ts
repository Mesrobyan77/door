import "server-only";

import { and, asc, eq, inArray, or } from "drizzle-orm";

import { getDb } from "@/db/client";
import { cartItems, mediaAssets, products } from "@/db/schema";
import type { CheckoutOrderProduct } from "@/features/checkout/ui/checkout-order-product";
import type { Locale } from "@/lib/i18n/config";
import { mediaPublicUrl } from "@/lib/media/public-url";

export type { CheckoutOrderProduct };

type CartItemWithProduct = {
  item: typeof cartItems.$inferSelect;
  product: typeof products.$inferSelect;
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
      objectKey: mediaAssets.objectKey,
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
    if (!row.productId || map.has(row.productId)) {
      continue;
    }
    map.set(row.productId, mediaPublicUrl(row.objectKey));
  }

  return map;
}

/** Builds checkout “products in your order” display rows from cart lines. */
export async function getCheckoutOrderProducts(
  locale: Locale,
  rows: CartItemWithProduct[],
): Promise<CheckoutOrderProduct[]> {
  const images = await loadPrimaryProductImages(
    rows.map(({ product }) => product.id),
  );

  return rows.map(({ item, product }) => {
    const translation =
      product.translations[locale] ?? product.translations.hy;
    return {
      id: item.id,
      title: translation?.title ?? product.sku,
      quantity: item.quantity,
      imageUrl: images.get(product.id) ?? null,
    };
  });
}
