import { notFound } from 'next/navigation';

import { AppLink } from '@/components/ui/AppLink';
import {
  parseCatalogFilters,
  type CatalogSearchParams,
} from '@/features/products/domain/catalog-filters';
import { getActiveCatalogCategories, getActiveProductsPage } from '@/features/products/queries';
import { CatalogFilterForm, getCatalogHref } from '@/features/products/ui/CatalogFilterForm';
import { ProductCard } from '@/features/products/ui/ProductCard';
import { getWishlistProductIds } from '@/features/wishlist/queries';
import { getCurrentUser } from '@/lib/auth/session';
import { getCheckoutRateSnapshot } from '@/lib/fx/service';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { createDisplayPriceFormatter, getSelectedCurrency } from '@/lib/money/display-price';

type ProductsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CatalogSearchParams>;
};

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale: rawLocale } = await params;
  const rawFilters = await searchParams;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const dictionary = getDictionary(rawLocale);
  const [categories, selectedCurrency, user] = await Promise.all([
    getActiveCatalogCategories(rawLocale),
    getSelectedCurrency(),
    getCurrentUser(),
  ]);
  const filters = parseCatalogFilters(
    rawFilters,
    selectedCurrency,
    new Set(categories.map((category) => category.slug)),
  );
  const hasPriceFilter = filters.minPrice != null || filters.maxPrice != null;
  const currency = hasPriceFilter ? filters.priceCurrency : selectedCurrency;
  const rateSnapshot = hasPriceFilter ? await getCheckoutRateSnapshot(currency) : undefined;
  let page = filters.page;
  const rate = rateSnapshot?.rate ?? '1';
  const initialCatalog = await getActiveProductsPage(rawLocale, page, filters, rate);

  const totalPages = Math.max(1, Math.ceil(initialCatalog.total / initialCatalog.pageSize));
  const catalog =
    page > totalPages
      ? await getActiveProductsPage(rawLocale, totalPages, filters, rate)
      : initialCatalog;
  if (page > totalPages) {
    page = totalPages;
  }

  const { products } = catalog;
  const [wishlistIds, formatPrice] = await Promise.all([
    getWishlistProductIds(products.map((p) => p.id)),
    createDisplayPriceFormatter(rawLocale, currency, rateSnapshot),
  ]);

  const priced = products.map((product) => {
    const priceFormatted =
      product.priceAmount == null
        ? dictionary.product.variant.inquiry
        : formatPrice(product.priceAmount).formatted;
    const compareAt = product.compareAtAmount != null ? formatPrice(product.compareAtAmount) : null;

    return {
      product,
      priceFormatted,
      compareAtFormatted: compareAt?.formatted ?? null,
    };
  });

  return (
    <section className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        {dictionary.nav.products}
      </h1>
      <CatalogFilterForm
        locale={rawLocale}
        filters={filters}
        categories={categories}
        currency={currency}
        copy={dictionary.catalog}
      />
      {priced.length > 0 ? (
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {priced.map(({ product, priceFormatted, compareAtFormatted }, index) => (
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
              variantId={
                product.variants.filter((variant) => variant.purchasable).length === 1
                  ? product.variants.find((variant) => variant.purchasable)?.id
                  : undefined
              }
              inWishlist={wishlistIds.has(product.id)}
              isSignedIn={Boolean(user)}
              wishlistLabel={dictionary.nav.wishlist}
              addToCartLabel={dictionary.product.addToCart}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-gray-200 p-6 text-sm text-gray-600">
          {dictionary.catalog.noResults}
        </p>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label={dictionary.catalog.paginationLabel}
          className="flex items-center justify-center gap-4"
        >
          {page > 1 ? (
            <AppLink
              href={getCatalogHref(rawLocale, filters, { page: page - 1 })}
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
              .replace('{page}', String(page))
              .replace('{total}', String(totalPages))}
          </span>
          {page < totalPages ? (
            <AppLink
              href={getCatalogHref(rawLocale, filters, { page: page + 1 })}
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
