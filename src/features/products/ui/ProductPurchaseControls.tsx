'use client';

import type { MouseEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { addToCart } from '@/features/cart/cart';
import { playCartFlyAnimation } from '@/features/cart/play-cart-fly-animation';
import { VariantSpecificationGroups } from '@/features/products/ui/VariantSpecificationGroups';
import type { ProductVariantOption } from '@/features/products/types';
import { WishlistButton } from '@/features/wishlist/ui/WishlistButton';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/get-dictionary';

type VariantChoice = ProductVariantOption & {
  priceFormatted: string | null;
  compareAtFormatted: string | null;
};

type ProductPurchaseControlsProps = {
  locale: Locale;
  productId: string;
  variants: VariantChoice[];
  inWishlist: boolean;
  isSignedIn: boolean;
  wishlistLabel: string;
  imageUrl?: string | null;
  onVariantSelectionChange?: (variantId: string) => void;
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
};

export function ProductPurchaseControls({
  locale,
  productId,
  variants,
  inWishlist,
  isSignedIn,
  wishlistLabel,
  imageUrl = null,
  onVariantSelectionChange,
  variantCopy,
  labels,
}: ProductPurchaseControlsProps) {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants.length === 1 ? (variants[0]?.id ?? '') : '',
  );
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const maxQty = selectedVariant?.purchasable ? Math.max(selectedVariant.stockOnHand, 0) : 0;
  const [quantity, setQuantity] = useState(maxQty > 0 ? 1 : 0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const disabled = !selectedVariant?.purchasable || maxQty < 1;

  function changeQuantity(next: number): void {
    if (disabled) return;
    setQuantity(Math.min(Math.max(1, next), maxQty));
    setMessage(null);
    setError(null);
  }

  function selectVariant(variantId: string): void {
    setSelectedVariantId(variantId);
    onVariantSelectionChange?.(variantId);
    setQuantity(1);
    setMessage(null);
    setError(null);
  }

  function handleAdd(event: MouseEvent<HTMLButtonElement>): void {
    if (disabled || quantity < 1 || !selectedVariant) return;
    setMessage(null);
    setError(null);

    const flySource =
      document.querySelector<HTMLElement>('[data-product-detail-fly-source]') ??
      event.currentTarget;

    playCartFlyAnimation({
      fromElement: flySource,
      imageUrl: selectedVariant.imageUrl ?? imageUrl,
    });

    startTransition(async () => {
      try {
        await addToCart(selectedVariant.id, quantity);
        setMessage(labels.added);
        router.refresh();
      } catch {
        setError(labels.error);
      }
    });
  }

  return (
    <div className="mt-auto flex flex-col gap-3 pt-2">
      {variants.length > 1 ? (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">{variantCopy.label}</span>
          <select
            value={selectedVariantId}
            onChange={(event) => selectVariant(event.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900"
          >
            <option value="">{labels.selectValue}</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.sku} · {variant.priceFormatted ?? variantCopy.inquiry}
                {!variant.purchasable ? ` · ${variantCopy.unavailable}` : ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {selectedVariant ? (
        <>
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-2xl font-semibold text-gray-900">
              {selectedVariant.priceFormatted ?? variantCopy.inquiry}
            </p>
            {selectedVariant.compareAtFormatted ? (
              <p className="text-base text-gray-500 line-through">
                {selectedVariant.compareAtFormatted}
              </p>
            ) : null}
            {selectedVariant.discountPercent != null ? (
              <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                -{selectedVariant.discountPercent}%
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span className={selectedVariant.purchasable ? 'text-green-700' : 'text-red-700'}>
              {selectedVariant.purchasable
                ? labels.inStock
                : selectedVariant.status === 'INQUIRY'
                  ? variantCopy.inquiry
                  : variantCopy.unavailable}
            </span>
          </div>
        </>
      ) : variants.length > 1 ? (
        <p className="text-sm text-gray-600">{labels.selectValue}</p>
      ) : (
        <p className="text-sm text-gray-600">{variantCopy.inquiry}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white">
          <button
            type="button"
            aria-label={labels.decreaseQuantity}
            disabled={disabled || quantity <= 1 || pending}
            onClick={() => changeQuantity(quantity - 1)}
            className="flex h-11 w-11 items-center justify-center text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <span
            className="min-w-10 text-center text-base font-semibold text-gray-900"
            aria-label={labels.quantity}
          >
            {quantity}
          </span>
          <button
            type="button"
            aria-label={labels.increaseQuantity}
            disabled={disabled || quantity >= maxQty || pending}
            onClick={() => changeQuantity(quantity + 1)}
            className="flex h-11 w-11 items-center justify-center text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          disabled={disabled || pending}
          onClick={handleAdd}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-gray-900 px-6 text-base font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:min-w-[12rem]"
        >
          {disabled
            ? !selectedVariant && variants.length > 1
              ? labels.selectValue
              : selectedVariant?.status === 'INQUIRY'
                ? variantCopy.inquiry
                : labels.outOfStock
            : pending
              ? labels.adding
              : labels.addToCart}
        </button>

        <WishlistButton
          locale={locale}
          productId={productId}
          initialInWishlist={inWishlist}
          isSignedIn={isSignedIn}
          label={wishlistLabel}
          className="h-11 w-11 border border-gray-200 bg-white hover:bg-gray-50"
        />
      </div>

      {selectedVariant ? (
        <VariantSpecificationGroups variant={selectedVariant} labels={variantCopy} />
      ) : null}

      {message ? (
        <p className="text-sm text-green-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
