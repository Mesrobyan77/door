"use client";

import type { MouseEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addToCart } from "@/features/cart/cart";
import { playCartFlyAnimation } from "@/features/cart/play-cart-fly-animation";
import { WishlistButton } from "@/features/wishlist/ui/WishlistButton";
import type { Locale } from "@/lib/i18n/config";

type ProductPurchaseControlsProps = {
  locale: Locale;
  productId: string;
  stockOnHand: number;
  inWishlist: boolean;
  isSignedIn: boolean;
  wishlistLabel: string;
  imageUrl?: string | null;
  labels: {
    quantity: string;
    decreaseQuantity: string;
    increaseQuantity: string;
    addToCart: string;
    adding: string;
    outOfStock: string;
    added: string;
    error: string;
  };
};

export function ProductPurchaseControls({
  locale,
  productId,
  stockOnHand,
  inWishlist,
  isSignedIn,
  wishlistLabel,
  imageUrl = null,
  labels,
}: ProductPurchaseControlsProps) {
  const router = useRouter();
  const maxQty = Math.max(stockOnHand, 0);
  const [quantity, setQuantity] = useState(maxQty > 0 ? 1 : 0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const disabled = maxQty < 1;

  function changeQuantity(next: number): void {
    if (disabled) return;
    setQuantity(Math.min(Math.max(1, next), maxQty));
    setMessage(null);
    setError(null);
  }

  function handleAdd(event: MouseEvent<HTMLButtonElement>): void {
    if (disabled || quantity < 1) return;
    setMessage(null);
    setError(null);

    const flySource =
      document.querySelector<HTMLElement>("[data-product-detail-fly-source]") ??
      event.currentTarget;

    playCartFlyAnimation({
      fromElement: flySource,
      imageUrl,
    });

    startTransition(async () => {
      try {
        await addToCart(productId, quantity);
        setMessage(labels.added);
        router.refresh();
      } catch {
        setError(labels.error);
      }
    });
  }

  return (
    <div className="mt-auto flex flex-col gap-3 pt-2">
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
            ? labels.outOfStock
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
