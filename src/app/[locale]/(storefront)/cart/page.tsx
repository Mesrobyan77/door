import { notFound } from "next/navigation";

import { AppLink } from "@/components/ui/AppLink";
import {
  getCartWithItems,
  removeItem,
  updateQuantity,
} from "@/features/cart/cart";
import { resolveVariantPrices } from "@/features/promotions/application/resolve-product-prices";
import { isVariantPurchasable } from "@/features/products/domain/door-variant";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type CartPageProps = { params: Promise<{ locale: string }> };

export default async function CartPage({ params }: CartPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { items } = await getCartWithItems();
  const prices = await resolveVariantPrices(
    items.flatMap(({ product, variant }) =>
      variant.priceAmount == null
        ? []
        : [{
            id: variant.id,
            productId: product.id,
            priceAmount: variant.priceAmount,
            compareAtAmount: variant.compareAtAmount,
          }],
    ),
  );
  const copy = getDictionary(locale).product.variant;

  const total = items.reduce((sum, { item, variant }) => {
    if (variant.priceAmount == null) return sum;
    const unit = prices.get(variant.id)?.unitAmount ?? variant.priceAmount;
    return sum + item.quantity * unit;
  }, 0);
  const hasUnpricedItems = items.some(({ variant }) => variant.priceAmount == null);
  const hasUnavailableItems = items.some(
    ({ item, product, variant }) =>
      product.status !== "ACTIVE" ||
      item.quantity > variant.stockOnHand ||
      !isVariantPurchasable({ product, variant }),
  );

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-semibold">Cart</h1>
      {items.map(({ item, product, variant }) => {
        const unit =
          variant.priceAmount == null
            ? null
            : (prices.get(variant.id)?.unitAmount ?? variant.priceAmount);
        const width =
          variant.itemType === "LEAF_ONLY"
            ? variant.leafWidthMm
            : variant.unitWidthMm;
        const height =
          variant.itemType === "LEAF_ONLY"
            ? variant.leafHeightMm
            : variant.unitHeightMm;
        return (
          <div
            className="flex items-center justify-between border p-3"
            key={item.id}
          >
            <div>
              <p>{product.translations[locale]?.title ?? product.sku}</p>
              <p className="text-sm text-gray-600">
                {copy.sku}: {variant.sku}
                {width && height
                  ? ` · ${width} × ${height} ${copy.millimetres}`
                  : ""}
              </p>
              <p className="text-sm">
                {unit == null
                  ? copy.inquiry
                  : `${unit} AMD × ${item.quantity}`}
              </p>
            </div>
            <div className="flex gap-2">
              <form
                action={async () => {
                  "use server";
                  await updateQuantity(item.id, item.quantity - 1);
                }}
              >
                <button className="border px-2">−</button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await updateQuantity(item.id, item.quantity + 1);
                }}
              >
                <button className="border px-2">+</button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await removeItem(item.id);
                }}
              >
                <button className="text-red-700">Remove</button>
              </form>
            </div>
          </div>
        );
      })}
      <p className="font-medium">
        Total: {hasUnpricedItems ? copy.inquiry : `${total} AMD`}
      </p>
      {items.length && !hasUnpricedItems && !hasUnavailableItems ? (
        <AppLink
          href={`/${locale}/checkout`}
          prefetchPolicy="intent"
          className="bg-[var(--accent)] px-4 py-2 text-center text-[var(--accent-foreground)]"
        >
          Checkout
        </AppLink>
      ) : (
        <p>
          {items.length
            ? hasUnpricedItems
              ? copy.inquiry
              : copy.unavailable
            : "Your cart is empty."}
        </p>
      )}
    </section>
  );
}
