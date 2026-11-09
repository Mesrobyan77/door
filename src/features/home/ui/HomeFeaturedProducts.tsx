import { AppLink } from '@/components/ui/AppLink';
import { ProductCard } from '@/features/products/ui/ProductCard';
import type { Locale } from '@/lib/i18n/config';

type FeaturedItem = {
  id: string;
  variantId?: string;
  href: string;
  title: string;
  priceFormatted: string;
  compareAtFormatted?: string | null;
  discountPercent?: number | null;
  imageUrl: string | null;
  illustrative?: boolean;
  inStock: boolean;
  inWishlist?: boolean;
};

type HomeFeaturedProductsProps = {
  locale: Locale;
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  emptyLabel: string;
  wishlistLabel: string;
  addToCartLabel: string;
  isSignedIn: boolean;
  products: readonly FeaturedItem[];
};

export function HomeFeaturedProducts({
  locale,
  title,
  viewAllLabel,
  viewAllHref,
  emptyLabel,
  wishlistLabel,
  addToCartLabel,
  isSignedIn,
  products,
}: HomeFeaturedProductsProps) {
  return (
    <section id="showroom" className="home-showroom scroll-mt-24 py-16 sm:py-24">
      <div className="design-container">
        <div className="mb-8 flex items-end justify-between gap-4 sm:mb-12">
          <div className="home-section-intro">
            <p>Hdoors / Showroom</p>
            <h2>{title}</h2>
          </div>
          <AppLink
            href={viewAllHref}
            prefetchPolicy="intent"
            className="text-sm font-semibold text-gray-700 underline-offset-4 hover:underline"
          >
            {viewAllLabel}
          </AppLink>
        </div>

        {products.length === 0 ? (
          <p className="text-gray-600">{emptyLabel}</p>
        ) : (
          <div className="home-featured-grid grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.slice(0, 4).map((product, index) => (
              <ProductCard
                key={product.id}
                href={product.href}
                title={product.title}
                priceFormatted={product.priceFormatted}
                compareAtFormatted={product.compareAtFormatted}
                discountPercent={product.discountPercent}
                imageUrl={product.imageUrl}
                illustrative={product.illustrative}
                inStock={product.inStock}
                priority={index < 4}
                locale={locale}
                productId={product.id}
                variantId={product.variantId}
                inWishlist={product.inWishlist ?? false}
                isSignedIn={isSignedIn}
                wishlistLabel={wishlistLabel}
                addToCartLabel={addToCartLabel}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
