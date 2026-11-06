"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { X } from "lucide-react";

import type { CheckoutOrderProduct } from "@/features/checkout/ui/checkout-order-product";
import { removeItem } from "@/features/cart/cart";
import { useSyncedState } from "@/lib/react/sync-state-from-prop";

type CheckoutProductsInOrderProps = {
  products: CheckoutOrderProduct[];
  title: string;
  itemsOneLabel: string;
  itemsManyLabel: string;
  removeItemLabel: string;
  onCartChanged?: () => void;
};

function formatItemCount(
  count: number,
  itemsOneLabel: string,
  itemsManyLabel: string,
): string {
  if (count === 1) {
    return itemsOneLabel;
  }
  return itemsManyLabel.replace("{count}", String(count));
}

export function CheckoutProductsInOrder({
  products: initialProducts,
  title,
  itemsOneLabel,
  itemsManyLabel,
  removeItemLabel,
  onCartChanged,
}: CheckoutProductsInOrderProps) {
  const router = useRouter();
  const [products, setProducts] = useSyncedState(initialProducts);
  const [pending, startTransition] = useTransition();
  const scrollerRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;

    function onWheel(event: WheelEvent): void {
      if (!element) return;
      if (element.scrollWidth <= element.clientWidth) return;
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      if (delta === 0) return;
      const next = Math.min(
        element.scrollWidth - element.clientWidth,
        Math.max(0, element.scrollLeft + delta),
      );
      if (next !== element.scrollLeft) {
        event.preventDefault();
        element.scrollLeft = next;
      }
    }

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
    };
  }, [products.length]);

  const itemCount = products.reduce((sum, product) => sum + product.quantity, 0);

  if (products.length === 0) {
    return null;
  }

  function onRemove(itemId: string): void {
    setProducts((current) => current.filter((product) => product.id !== itemId));
    onCartChanged?.();

    startTransition(async () => {
      await removeItem(itemId);
      router.refresh();
    });
  }

  return (
    <section
      className="mb-6 rounded-[15px] border border-gray-200 bg-white px-5 py-4 sm:px-6 sm:py-5"
      aria-labelledby="checkout-order-items-preview-title"
    >
      <div className="flex items-start justify-between gap-4">
        <h2
          id="checkout-order-items-preview-title"
          className="text-sm font-bold tracking-wide text-gray-900"
        >
          {title}
        </h2>
        <p className="shrink-0 text-sm text-gray-500">
          {formatItemCount(itemCount, itemsOneLabel, itemsManyLabel)}
        </p>
      </div>

      <ul
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto overscroll-x-contain pt-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <li
            key={product.id}
            className="w-max max-w-[320px] min-w-[200px] shrink-0 rounded-[20px] border border-gray-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-stretch gap-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-50">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    sizes="80px"
                    className="object-contain p-1.5"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    —
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="line-clamp-2 text-sm font-medium text-gray-900"
                    title={product.title}
                  >
                    {product.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemove(product.id)}
                    disabled={pending}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-60"
                    aria-label={removeItemLabel}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <span className="inline-flex h-6 min-w-[24px] w-fit items-center justify-center rounded-full border border-gray-200 bg-sky-50/70 px-2 text-[11px] font-semibold text-gray-900">
                  ×{product.quantity}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
