import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/features/products/ui/ProductCard";
import { listWishlistProducts } from "@/features/wishlist/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import {
  createDisplayPriceFormatter,
  getSelectedCurrency,
} from "@/lib/money/display-price";

type WishlistPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WishlistPage({ params }: WishlistPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const dictionary = getDictionary(rawLocale);
  const [user, currency, products] = await Promise.all([
    getCurrentUser(),
    getSelectedCurrency(),
    listWishlistProducts(rawLocale),
  ]);

  if (!user) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          {dictionary.nav.wishlist}
        </h1>
        <p className="text-gray-600">
          <Link
            href={`/${rawLocale}/login?next=${encodeURIComponent(`/${rawLocale}/wishlist`)}`}
            className="font-medium text-gray-900 underline underline-offset-2"
          >
            {dictionary.header.login}
          </Link>{" "}
          — {dictionary.wishlist.signInPrompt}
        </p>
      </section>
    );
  }

  const formatPrice = await createDisplayPriceFormatter(rawLocale, currency);
  const priced = products.map((product) => {
    const price = formatPrice(product.priceAmount);
    const compareAt =
      product.compareAtAmount != null
        ? formatPrice(product.compareAtAmount)
        : null;

    return {
      product,
      priceFormatted: price.formatted,
      compareAtFormatted: compareAt?.formatted ?? null,
    };
  });

  return (
    <section className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        {dictionary.nav.wishlist}
      </h1>

      {priced.length === 0 ? (
        <p className="text-gray-600">{dictionary.wishlist.empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {priced.map(
            ({ product, priceFormatted, compareAtFormatted }, index) => (
              <ProductCard
                key={product.id}
                href={`/${rawLocale}/products/${product.translation.slug}`}
                title={product.translation.title}
                priceFormatted={priceFormatted}
                compareAtFormatted={compareAtFormatted}
                discountPercent={product.discountPercent}
                imageUrl={product.imageUrl}
                inStock={product.stockOnHand > 0}
                priority={index < 4}
                locale={rawLocale}
                productId={product.id}
                inWishlist
                isSignedIn
                wishlistLabel={dictionary.nav.wishlist}
                addToCartLabel={dictionary.product.addToCart}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}
