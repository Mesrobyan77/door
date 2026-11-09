'use client';

import { useState, type ReactNode } from 'react';

import { ProductGallery } from '@/features/products/ui/ProductGallery';
import { ProductPurchaseControls } from '@/features/products/ui/ProductPurchaseControls';
import type { ProductDetail } from '@/features/products/types';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import type { Locale } from '@/lib/i18n/config';

type VariantChoice = ProductDetail['variants'][number] & {
  priceFormatted: string | null;
  compareAtFormatted: string | null;
};

type ProductVariantExperienceProps = {
  locale: Locale;
  product: ProductDetail;
  variants: VariantChoice[];
  isSignedIn: boolean;
  inWishlist: boolean;
  wishlistLabel: string;
  variantCopy: Dictionary['product']['variant'];
  labels: {
    quantity: string;
    decreaseQuantity: string;
    increaseQuantity: string;
    addToCart: string;
    adding: string;
    outOfStock: string;
    added: string;
    error: string;
    sku: string;
    inStock: string;
    selectValue: string;
  };
  children: ReactNode;
};

export function ProductVariantExperience({
  locale,
  product,
  variants,
  isSignedIn,
  inWishlist,
  wishlistLabel,
  variantCopy,
  labels,
  children,
}: ProductVariantExperienceProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants.length === 1 ? (variants[0]?.id ?? '') : '',
  );
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);

  return (
    <>
      <div>
        <ProductGallery
          images={selectedVariant?.images.length ? selectedVariant.images : product.images}
          title={product.translation.title}
          discountPercent={selectedVariant?.discountPercent ?? null}
          inStock={selectedVariant?.purchasable ?? variants.some((variant) => variant.purchasable)}
          outOfStockLabel={
            selectedVariant?.status === 'INQUIRY' ? variantCopy.inquiry : labels.outOfStock
          }
          locale={locale}
        />
      </div>
      <div className="flex flex-col gap-5 rounded-lg border border-border bg-white p-5 sm:p-7 lg:min-h-full">
        {children}
        <ProductPurchaseControls
          locale={locale}
          productId={product.id}
          variants={variants}
          inWishlist={inWishlist}
          isSignedIn={isSignedIn}
          wishlistLabel={wishlistLabel}
          imageUrl={product.images[0]?.url ?? null}
          variantCopy={variantCopy}
          labels={labels}
          onVariantSelectionChange={setSelectedVariantId}
        />
      </div>
    </>
  );
}
