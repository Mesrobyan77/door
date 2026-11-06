import Link from "next/link";

import { ProductGallery } from "@/features/products/ui/ProductGallery";
import { ProductPurchaseControls } from "@/features/products/ui/ProductPurchaseControls";
import type { ProductDetail } from "@/features/products/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type ProductDetailViewProps = {
  locale: Locale;
  product: ProductDetail;
  priceFormatted: string;
  compareAtFormatted: string | null;
  isSignedIn: boolean;
  inWishlist: boolean;
  dictionary: Dictionary;
  jsonLd: Record<string, unknown>;
  relatedSlot: React.ReactNode;
  reviewsSlot: React.ReactNode;
};

export function ProductDetailView({
  locale,
  product,
  priceFormatted,
  compareAtFormatted,
  isSignedIn,
  inWishlist,
  dictionary,
  jsonLd,
  relatedSlot,
  reviewsSlot,
}: ProductDetailViewProps) {
  const labels = dictionary.product;
  const inStock = product.stockOnHand > 0;

  return (
    <article className="flex flex-col gap-16 md:gap-20">
      <p className="text-sm text-gray-600">
        <Link
          href={`/${locale}/products`}
          className="font-medium text-gray-900 underline-offset-2 hover:underline"
        >
          {labels.backToProducts}
        </Link>
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery
          images={product.images}
          title={product.translation.title}
          discountPercent={product.discountPercent}
          inStock={inStock}
          outOfStockLabel={labels.outOfStock}
        />

        <div className="flex flex-col gap-6 lg:min-h-full">
          {product.categories.length > 0 ? (
            <p className="text-sm font-medium text-gray-500">
              {product.categories.map((category) => category.title).join(" · ")}
            </p>
          ) : null}

          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            {product.translation.title}
          </h1>

          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-2xl font-semibold text-gray-900">
              {priceFormatted}
            </p>
            {compareAtFormatted ? (
              <p className="text-base text-gray-500 line-through">
                {compareAtFormatted}
              </p>
            ) : null}
            {product.discountPercent != null ? (
              <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                -{product.discountPercent}%
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span>
              {labels.sku}: {product.sku}
            </span>
            <span aria-hidden>·</span>
            <span className={inStock ? "text-green-700" : "text-red-700"}>
              {inStock ? labels.inStock : labels.outOfStock}
            </span>
          </div>

          {product.translation.description ? (
            <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-600">
              {product.translation.description}
            </p>
          ) : null}

          <ProductPurchaseControls
            locale={locale}
            productId={product.id}
            stockOnHand={product.stockOnHand}
            inWishlist={inWishlist}
            isSignedIn={isSignedIn}
            wishlistLabel={dictionary.nav.wishlist}
            imageUrl={product.images[0]?.url ?? null}
            labels={{
              quantity: labels.quantity,
              decreaseQuantity: dictionary.cartDrawer.decreaseQuantity,
              increaseQuantity: dictionary.cartDrawer.increaseQuantity,
              addToCart: labels.addToCart,
              adding: labels.adding,
              outOfStock: labels.outOfStock,
              added: labels.added,
              error: labels.addError,
            }}
          />
        </div>
      </div>

      {relatedSlot}
      {reviewsSlot}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}
