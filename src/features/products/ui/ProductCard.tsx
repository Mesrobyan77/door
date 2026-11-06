import Image from "next/image";

import { AppLink } from "@/components/ui/AppLink";
import { AddToCartButton } from "@/features/cart/ui/AddToCartButton";
import { WishlistButton } from "@/features/wishlist/ui/WishlistButton";
import type { Locale } from "@/lib/i18n/config";

type ProductCardProps = {
  href: string;
  title: string;
  priceFormatted: string;
  compareAtFormatted?: string | null;
  discountPercent?: number | null;
  imageUrl: string | null;
  inStock: boolean;
  priority?: boolean;
  locale?: Locale;
  productId?: string;
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
  inStock,
  priority = false,
  locale,
  productId,
  inWishlist = false,
  isSignedIn = false,
  wishlistLabel,
  addToCartLabel,
}: ProductCardProps) {
  const onSale = Boolean(compareAtFormatted);
  const showWishlist =
    locale != null && productId != null && wishlistLabel != null;
  const showAddToCart = productId != null && addToCartLabel != null;

  return (
    <div className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md">
      <div
        className="relative aspect-square overflow-hidden bg-gray-100"
        data-cart-fly-source
      >
        <AppLink
          href={href}
          prefetchPolicy={priority ? "intent" : "auto"}
          className="absolute inset-0 block"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority={priority}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
              No image
            </div>
          )}
        </AppLink>

        {showWishlist ? (
          <WishlistButton
            locale={locale}
            productId={productId}
            initialInWishlist={inWishlist}
            isSignedIn={isSignedIn}
            label={wishlistLabel}
            size="sm"
            className="absolute top-3 left-3 z-10 h-9 w-9 bg-white/90 text-gray-800 shadow-sm hover:bg-white"
          />
        ) : null}

        {discountPercent != null ? (
          <span className="absolute top-3 right-3 z-10 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
            -{discountPercent}%
          </span>
        ) : null}

        {showAddToCart ? (
          <AddToCartButton
            productId={productId}
            label={addToCartLabel}
            disabled={!inStock}
            size="sm"
            imageUrl={imageUrl}
            className="absolute right-3 bottom-3 z-10 h-9 w-9 bg-white/90 text-gray-800 shadow-sm hover:bg-white"
          />
        ) : null}

        {!inStock ? (
          <span className="absolute bottom-3 left-3 z-10 rounded bg-gray-900/90 px-2 py-1 text-xs font-semibold text-white">
            Out of stock
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="mb-1 line-clamp-2 text-base font-medium text-gray-900">
          <AppLink
            href={href}
            prefetchPolicy={priority ? "intent" : "auto"}
            className="hover:underline"
          >
            {title}
          </AppLink>
        </h3>
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-lg font-semibold text-gray-900">{priceFormatted}</p>
          {onSale ? (
            <p className="text-sm text-gray-500 line-through">
              {compareAtFormatted}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
