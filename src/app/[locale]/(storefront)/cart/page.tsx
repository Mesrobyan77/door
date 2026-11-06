import { notFound } from "next/navigation";

import { AppLink } from "@/components/ui/AppLink";
import {
  getCartWithItems,
  removeItem,
  updateQuantity,
} from "@/features/cart/cart";
import { resolveProductPrices } from "@/features/promotions/application/resolve-product-prices";
import { isLocale } from "@/lib/i18n/config";

type CartPageProps = { params: Promise<{ locale: string }> };

export default async function CartPage({ params }: CartPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { items } = await getCartWithItems();
  const prices = await resolveProductPrices(
    items.map(({ product }) => ({
      id: product.id,
      priceAmount: product.priceAmount,
      compareAtAmount: product.compareAtAmount,
    })),
  );

  const total = items.reduce((sum, { item, product }) => {
    const unit = prices.get(product.id)?.unitAmount ?? product.priceAmount;
    return sum + item.quantity * unit;
  }, 0);

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-semibold">Cart</h1>
      {items.map(({ item, product }) => {
        const unit =
          prices.get(product.id)?.unitAmount ?? product.priceAmount;
        return (
          <div
            className="flex items-center justify-between border p-3"
            key={item.id}
          >
            <div>
              <p>{product.translations[locale]?.title ?? product.sku}</p>
              <p className="text-sm">
                {unit} AMD × {item.quantity}
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
      <p className="font-medium">Total: {total} AMD</p>
      {items.length ? (
        <AppLink
          href={`/${locale}/checkout`}
          prefetchPolicy="intent"
          className="bg-[var(--accent)] px-4 py-2 text-center text-[var(--accent-foreground)]"
        >
          Checkout
        </AppLink>
      ) : (
        <p>Your cart is empty.</p>
      )}
    </section>
  );
}
