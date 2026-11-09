import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { AppLink } from '@/components/ui/AppLink';
import { AddToCartButton } from '@/features/cart/ui/AddToCartButton';
import { WishlistButton } from '@/features/wishlist/ui/WishlistButton';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { Locale } from '@/lib/i18n/config';

type ProductCardProps = {
  href: string;
  title: string;
  priceFormatted: string;
  compareAtFormatted?: string | null;
  discountPercent?: number | null;
  imageUrl: string | null;
  illustrative?: boolean;
  inStock: boolean;
  priority?: boolean;
  locale?: Locale;
  productId?: string;
  variantId?: string;
  inWishlist?: boolean;
  isSignedIn?: boolean;
  wishlistLabel?: string;
  addToCartLabel?: string;
};

export function ProductCard({
  href,
  title,
  priceFormatted,
  compareAtFormatted = null,
  discountPercent = null,
  imageUrl,
  illustrative = false,
  inStock,
  priority = false,
  locale = 'hy',
  productId,
  variantId,
  inWishlist = false,
  isSignedIn = false,
  wishlistLabel,
  addToCartLabel,
}: ProductCardProps) {
  const copy = getDictionary(locale);
  return (
    <article className="product-card group relative flex h-full min-w-0 flex-col overflow-hidden rounded-md border border-border bg-white p-1.5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-md">
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-sm bg-[linear-gradient(145deg,#f3eee8,#e7ded4)]"
        data-cart-fly-source
      >
        <AppLink
          href={href}
          prefetchPolicy={priority ? 'intent' : 'auto'}
          className="absolute inset-0 block"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={illustrative ? `${copy.design.hero.illustrative} — ${title}` : title}
              fill
              sizes="(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 20vw"
              className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03] sm:p-3"
              priority={priority}
            />
          ) : (
            <span className="flex h-full items-center justify-center px-3 text-center text-xs text-gray-500">
              {copy.design.noImage}
            </span>
          )}
        </AppLink>
        {productId && wishlistLabel ? (
          <WishlistButton
            locale={locale}
            productId={productId}
            initialInWishlist={inWishlist}
            isSignedIn={isSignedIn}
            label={wishlistLabel}
            size="sm"
            className="absolute top-1 right-1 z-10 h-9 w-9 bg-white/90 text-gray-800 hover:bg-white"
          />
        ) : null}
        {discountPercent != null ? (
          <span className="absolute top-2 left-2 rounded-sm bg-red-700 px-2 py-1 text-[10px] font-semibold text-white">
            −{discountPercent}%
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-2.5 py-3">
        {illustrative ? (
          <p className="mb-1.5 text-[11px] leading-4 text-gray-500">
            {copy.design.hero.illustrative}
          </p>
        ) : null}
        <h3 className="line-clamp-2 min-h-12 text-sm leading-6 font-medium text-gray-900">
          <AppLink href={href} prefetchPolicy="intent" className="hover:underline">
            {title}
          </AppLink>
        </h3>
        <div className="mt-3 flex min-h-[52px] flex-col items-start justify-start gap-1">
          <div>
            <p className="text-[15px] font-bold tracking-tight text-gray-950">{priceFormatted}</p>
            {compareAtFormatted ? (
              <p className="text-xs text-gray-500 line-through">{compareAtFormatted}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-auto pt-2">
          {variantId && addToCartLabel ? (
            <AddToCartButton
              variantId={variantId}
              label={addToCartLabel}
              disabled={!inStock}
              size="sm"
              imageUrl={imageUrl}
              showLabel
              className="card-purchase min-h-11 w-full gap-2 !rounded-sm bg-gray-900 px-3 py-2.5 text-xs font-medium text-white hover:bg-gray-700"
            />
          ) : (
            <AppLink
              href={href}
              prefetchPolicy="intent"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-gray-900 px-3 py-2.5 text-xs font-medium text-white hover:bg-gray-700"
            >
              {copy.design.configure}
              <ArrowRight className="h-3 w-3" />
            </AppLink>
          )}
        </div>
      </div>
    </article>
  );
}
