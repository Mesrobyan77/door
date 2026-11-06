import { notFound } from "next/navigation";

import { AppLink } from "@/components/ui/AppLink";
import { ProductCard } from "@/features/products/ui/ProductCard";
import { getActiveProductsPage } from "@/features/products/queries";
import { getWishlistProductIds } from "@/features/wishlist/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import {
  createDisplayPriceFormatter,
  getSelectedCurrency,
} from "@/lib/money/display-price";

type ProductsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function ProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const { locale: rawLocale } = await params;
  const { page: pageRaw } = await searchParams;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const parsedPage = Number.parseInt(pageRaw ?? "1", 10);
  let page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const dictionary = getDictionary(rawLocale);
  const [initialCatalog, currency, user] = await Promise.all([
    getActiveProductsPage(rawLocale, page),
    getSelectedCurrency(),
    getCurrentUser(),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(initialCatalog.total / initialCatalog.pageSize),
  );
  const catalog =
    page > totalPages
      ? await getActiveProductsPage(rawLocale, totalPages)
      : initialCatalog;
  if (page > totalPages) {
    page = totalPages;
  }

  const { products } = catalog;
  const [wishlistIds, formatPrice] = await Promise.all([
    getWishlistProductIds(products.map((p) => p.id)),
    createDisplayPriceFormatter(rawLocale, currency),
  ]);

  const priced = products.map((product) => {
    const price = formatPrice(product.priceAmount);
    const compareAt =
      product.compareAtAmount != null
        ? formatPrice(product.compareAtAmount)
        : null;

    return {
      product,
      price,
      compareAtFormatted: compareAt?.formatted ?? null,
    };
  });

  return (
    <section className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        {dictionary.nav.products}
      </h1>
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {priced.map(({ product, price, compareAtFormatted }, index) => (
          <ProductCard
            key={product.id}
            href={`/${rawLocale}/products/${product.translation.slug}`}
            title={product.translation.title}
            priceFormatted={price.formatted}
            compareAtFormatted={compareAtFormatted}
            discountPercent={product.discountPercent}
            imageUrl={product.imageUrl}
            inStock={product.stockOnHand > 0}
            priority={index < 4}
            locale={rawLocale}
            productId={product.id}
            inWishlist={wishlistIds.has(product.id)}
            isSignedIn={Boolean(user)}
            wishlistLabel={dictionary.nav.wishlist}
            addToCartLabel={dictionary.product.addToCart}
          />
        ))}
      </div>

      {totalPages > 1 ? (
        <nav
          aria-label={dictionary.catalog.paginationLabel}
          className="flex items-center justify-center gap-4"
        >
          {page > 1 ? (
            <AppLink
              href={`/${rawLocale}/products?page=${page - 1}`}
              prefetchPolicy="intent"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {dictionary.catalog.previousPage}
            </AppLink>
          ) : (
            <span className="rounded-lg border border-transparent px-4 py-2 text-sm text-gray-300">
              {dictionary.catalog.previousPage}
            </span>
          )}
          <span className="text-sm text-gray-600">
            {dictionary.catalog.pageStatus
              .replace("{page}", String(page))
              .replace("{total}", String(totalPages))}
          </span>
          {page < totalPages ? (
            <AppLink
              href={`/${rawLocale}/products?page=${page + 1}`}
              prefetchPolicy="intent"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {dictionary.catalog.nextPage}
            </AppLink>
          ) : (
            <span className="rounded-lg border border-transparent px-4 py-2 text-sm text-gray-300">
              {dictionary.catalog.nextPage}
            </span>
          )}
        </nav>
      ) : null}
    </section>
  );
}
