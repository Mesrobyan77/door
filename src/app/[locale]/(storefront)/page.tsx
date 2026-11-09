import { notFound } from 'next/navigation';

import { listActiveHeroSlides } from '@/features/hero/application/queries';
import { HomeFeaturedProducts } from '@/features/home/ui/HomeFeaturedProducts';
import { HomeStory } from '@/features/home/ui/HomeStory';
import { getHomeCollections } from '@/features/home/queries';
import { HomeHero } from '@/features/home/ui/HomeHero';
import { HomeCatalogLinks } from '@/features/home/ui/HomeCatalogLinks';
import { getFeaturedProducts } from '@/features/products/queries';
import { getStoreHomepage } from '@/features/settings';
import { getWishlistProductIds } from '@/features/wishlist/queries';
import { getCurrentUser } from '@/lib/auth/session';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { createDisplayPriceFormatter, getSelectedCurrency } from '@/lib/money/display-price';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const dictionary = getDictionary(locale);
  const [heroSlides, featuredProducts, homepage, currency, user, collections] = await Promise.all([
    listActiveHeroSlides(locale),
    getFeaturedProducts(locale),
    getStoreHomepage(),
    getSelectedCurrency(),
    getCurrentUser(),
    getHomeCollections(locale),
  ]);
  const localized = (value: Partial<Record<Locale, string>>, fallback = '') =>
    value[locale] ?? value.hy ?? fallback;
  const [wishlistIds, formatPrice] = await Promise.all([
    getWishlistProductIds(featuredProducts.map((product) => product.id)),
    createDisplayPriceFormatter(locale, currency),
  ]);

  const featuredCards = featuredProducts.map((product) => {
    const priceFormatted =
      product.priceAmount == null
        ? dictionary.product.variant.inquiry
        : formatPrice(product.priceAmount).formatted;
    const compareAt = product.compareAtAmount != null ? formatPrice(product.compareAtAmount) : null;

    return {
      id: product.id,
      variantId:
        product.variants.length === 1 && product.variants[0]?.purchasable
          ? product.variants.find((variant) => variant.purchasable)?.id
          : undefined,
      href: `/${locale}/products/${product.translation.slug}`,
      title: product.translation.title,
      priceFormatted,
      compareAtFormatted: compareAt?.formatted ?? null,
      discountPercent: product.discountPercent,
      imageUrl: product.imageUrl,
      illustrative: product.imageIsIllustrative,
      inStock: product.stockOnHand > 0,
      inWishlist: wishlistIds.has(product.id),
    };
  });

  return (
    <div className="home-page -mx-4 sm:-mx-6 lg:-mx-8">
      <HomeHero
        slides={heroSlides}
        fallbackTitle={dictionary.home.title}
        fallbackSubtitle={dictionary.home.subtitle}
        fallbackCtaLabel={dictionary.home.cta}
        fallbackCtaHref={`/${locale}/products`}
      />

      <HomeFeaturedProducts
        locale={locale}
        title={localized(homepage.featuredTitle)}
        viewAllLabel={localized(homepage.viewAllLabel)}
        viewAllHref={`/${locale}/products`}
        emptyLabel={localized(homepage.emptyFeaturedLabel)}
        wishlistLabel={dictionary.nav.wishlist}
        addToCartLabel={dictionary.product.addToCart}
        isSignedIn={Boolean(user)}
        products={featuredCards}
      />

      <HomeCatalogLinks
        title={localized(homepage.categoriesTitle)}
        items={collections}
        viewLabel={localized(homepage.viewAllLabel)}
      />

      <HomeStory
        about={{
          eyebrow: localized(homepage.about.eyebrow),
          title: localized(homepage.about.title),
          description: localized(homepage.about.description),
          ctaLabel: localized(homepage.about.ctaLabel),
        }}
        benefits={homepage.benefits.map((item) => ({
          title: localized(item.title),
          description: localized(item.description),
        }))}
        imageUrl={heroSlides[0]?.desktopImageUrl ?? null}
        ctaHref={`/${locale}/about`}
      />
      <section className="design-container py-5" aria-label={localized(homepage.brandsTitle)}>
        <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-xs font-medium tracking-wider text-gray-600">
          {homepage.brands.map((brand) => (
            <span key={brand}>{brand}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
