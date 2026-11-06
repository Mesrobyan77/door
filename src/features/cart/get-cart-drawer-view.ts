import "server-only";

import { and, asc, eq, inArray, or } from "drizzle-orm";

import { getCartWithItems } from "@/features/cart/cart";
import { getDb } from "@/db/client";
import { mediaAssets } from "@/db/schema";
import { resolveVariantPrices } from "@/features/promotions/application/resolve-product-prices";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { formatVariantConfiguration } from "@/features/products/domain/format-variant-configuration";
import { isVariantPurchasable } from "@/features/products/domain/door-variant";
import { getCheckoutRateSnapshot } from "@/lib/fx/service";
import { convertAmount } from "@/lib/money/convert";
import type { Currency } from "@/lib/money/currency";
import { defaultCurrency } from "@/lib/money/currency";
import { formatMoneyAmount } from "@/lib/money/format";

export type CartDrawerItemView = {
  id: string;
  title: string;
  quantity: number;
  imageUrl: string | null;
  unitPriceFormatted: string | null;
  lineTotalFormatted: string | null;
  configuration: string;
};

export type CartDrawerView = {
  itemCount: number;
  items: CartDrawerItemView[];
  subtotalFormatted: string;
  shippingFormatted: string;
  totalFormatted: string | null;
  hasUnpricedItems: boolean;
  hasUnavailableItems: boolean;
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

function formatConvertedAmount(
  baseAmountAmd: number,
  rate: string,
  currency: Currency,
  locale: Locale,
): string {
  const converted = convertAmount(
    baseAmountAmd,
    rate,
    defaultCurrency,
    currency,
  );
  return formatMoneyAmount(converted.amount, currency, locale);
}

/** Builds storefront cart-drawer display data for the active cart. */
export async function getCartDrawerView(
  locale: Locale,
  currency: Currency,
): Promise<CartDrawerView> {
  const { items: rows } = await getCartWithItems();
  const variantCopy = getDictionary(locale).product.variant;
  const [images, variantImages, quote, prices] = await Promise.all([
    loadPrimaryProductImages(rows.map(({ product }) => product.id)),
    loadPrimaryVariantImages(rows.map(({ variant }) => variant.id)),
    getCheckoutRateSnapshot(currency),
    resolveVariantPrices(
      rows.flatMap(({ product, variant }) =>
        variant.priceAmount == null
          ? []
          : [{
              id: variant.id,
              productId: product.id,
              priceAmount: variant.priceAmount,
              compareAtAmount: variant.compareAtAmount,
            }],
      ),
    ),
  ]);

  const items: CartDrawerItemView[] = [];
  let subtotalBase = 0;

  for (const { item, product, variant } of rows) {
    const translation =
      product.translations[locale] ?? product.translations.hy;
    const unitAmount =
      variant.priceAmount == null
        ? null
        : (prices.get(variant.id)?.unitAmount ?? variant.priceAmount);
    const configuration = formatVariantConfiguration(variant, variantCopy);

    items.push({
      id: item.id,
      title: translation?.title ?? product.sku,
      quantity: item.quantity,
      imageUrl: variantImages.get(variant.id) ?? images.get(product.id) ?? null,
      configuration,
      unitPriceFormatted:
        unitAmount == null
          ? null
          : formatConvertedAmount(unitAmount, quote.rate, currency, locale),
      lineTotalFormatted:
        unitAmount == null
          ? null
          : formatConvertedAmount(
              unitAmount * item.quantity,
              quote.rate,
              currency,
              locale,
            ),
    });
    if (unitAmount != null) subtotalBase += item.quantity * unitAmount;
  }

  const hasUnpricedItems = items.some((item) => item.unitPriceFormatted === null);
  const hasUnavailableItems = rows.some(
    ({ item, product, variant }) =>
      product.status !== "ACTIVE" ||
      item.quantity > variant.stockOnHand ||
      !isVariantPurchasable({ product, variant }),
  );
  const subtotalFormatted = formatConvertedAmount(
    subtotalBase,
    quote.rate,
    currency,
    locale,
  );

  return {
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
    subtotalFormatted,
    shippingFormatted: formatMoneyAmount(0, currency, locale),
    totalFormatted: hasUnpricedItems ? null : subtotalFormatted,
    hasUnpricedItems,
    hasUnavailableItems,
  };
}
