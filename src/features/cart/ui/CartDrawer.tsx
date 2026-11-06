"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ArrowRight, Minus, Plus, ShoppingCart, X } from "lucide-react";

import { AppLink } from "@/components/ui/AppLink";
import { SideSheet } from "@/components/ui/SideSheet";
import { removeItem, updateQuantity } from "@/features/cart/cart";
import type { CartDrawerView } from "@/features/cart/get-cart-drawer-view";
import { loadCartDrawerViewAction } from "@/features/cart/load-cart-drawer-view-action";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { Currency } from "@/lib/money/currency";

type CartDrawerTriggerArgs = {
  open: boolean;
  badgeCount: number;
  label: string;
  openDrawer: () => void;
  prefetchDrawerView: () => void;
};

type CartDrawerProps = {
  locale: Locale;
  currency: Currency;
  dictionary: Dictionary;
  itemCount: number;
  /** Custom trigger (e.g. mobile bottom nav). Defaults to header cart button. */
  renderTrigger?: (args: CartDrawerTriggerArgs) => React.ReactNode;
};

function formatItemCount(
  count: number,
  labels: Dictionary["cartDrawer"],
): string {
  if (count === 1) {
    return labels.itemsOne;
  }
  return labels.itemsMany.replace("{count}", String(count));
}

export function CartDrawer({
  locale,
  currency,
  dictionary,
  itemCount,
  renderTrigger,
}: CartDrawerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CartDrawerView | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  const [pending, startTransition] = useTransition();
  const labels = dictionary.cartDrawer;
  // Prefer live server count while closed — cached view goes stale after addToCart.
  const badgeCount = open && view != null ? view.itemCount : itemCount;
  const hasItems = Boolean(view && view.items.length > 0);

  function loadDrawerView(): void {
    setLoadingView(true);
    startTransition(async () => {
      const next = await loadCartDrawerViewAction(locale, currency);
      setView(next);
      setLoadingView(false);
    });
  }

  function prefetchDrawerView(): void {
    if (view || loadingView || open) {
      return;
    }
    loadDrawerView();
  }

  function openDrawer(): void {
    setOpen(true);
    // Always refetch: layout-level CartDrawer keeps client state across navigations.
    loadDrawerView();
  }

  function closeDrawer(): void {
    setOpen(false);
  }

  function changeQuantity(itemId: string, quantity: number): void {
    startTransition(async () => {
      await updateQuantity(itemId, quantity);
      const next = await loadCartDrawerViewAction(locale, currency);
      setView(next);
    });
  }

  function removeCartItem(itemId: string): void {
    startTransition(async () => {
      await removeItem(itemId);
      const next = await loadCartDrawerViewAction(locale, currency);
      setView(next);
    });
  }

  return (
    <>
      <SideSheet
        open={open}
        onClose={closeDrawer}
        ariaLabel={labels.title}
        panelClassName="w-[87%] max-w-[420px]"
        zIndexClassName="z-[200]"
        backdropBlur
      >
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            {labels.title}
          </h2>
          {hasItems ? (
            <p className="mt-1 text-sm text-gray-500">
              {formatItemCount(badgeCount, labels)}
            </p>
          ) : null}
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 ${
            pending || loadingView ? "opacity-70" : ""
          }`}
        >
          {loadingView && !view ? (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-[20px] bg-gray-100" />
              <div className="h-24 animate-pulse rounded-[20px] bg-gray-100" />
            </div>
          ) : !view || view.items.length === 0 ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-2 text-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <ShoppingCart className="h-12 w-12" aria-hidden />
              </div>
              <p className="mt-5 text-xl font-bold text-gray-900">
                {labels.empty}
              </p>
              <p className="mt-2 max-w-[20rem] text-sm leading-relaxed text-gray-500">
                {labels.emptyDescription}
              </p>
              <AppLink
                href={`/${locale}/products`}
                prefetchPolicy="intent"
                onClick={closeDrawer}
                className="relative mt-6 inline-flex min-h-[50px] w-full max-w-sm items-center rounded-full bg-gray-900 py-1.5 pr-1.5 pl-5 text-sm font-semibold text-white transition-colors hover:bg-black"
              >
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-12">
                  {labels.emptyCta}
                </span>
                <span className="relative ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </AppLink>
            </div>
          ) : (
            <ul className="space-y-3">
              {view.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-[20px] border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex gap-3">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          sizes="96px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          —
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium text-gray-900">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            {item.lineTotalFormatted}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {item.unitPriceFormatted} × {item.quantity}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          aria-label={labels.removeItem}
                          disabled={pending}
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      </div>

                      <div className="mt-auto flex justify-end pt-3">
                        <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-sky-50/70 px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(item.id, item.quantity - 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-white"
                            aria-label={labels.decreaseQuantity}
                            disabled={pending}
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <span className="min-w-5 text-center text-sm font-medium tabular-nums text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(item.id, item.quantity + 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-white"
                            aria-label={labels.increaseQuantity}
                            disabled={pending}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-gray-600">
              <dt>{labels.subtotal}</dt>
              <dd className="tabular-nums text-gray-900">
                {view?.subtotalFormatted ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between text-gray-600">
              <dt>{labels.shipping}</dt>
              <dd className="tabular-nums text-gray-900">
                {view?.shippingFormatted ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between pt-1 text-base font-bold text-gray-900">
              <dt>{labels.total}</dt>
              <dd className="tabular-nums">{view?.totalFormatted ?? "—"}</dd>
            </div>
          </dl>

          {hasItems ? (
            <AppLink
              href={`/${locale}/checkout`}
              prefetchPolicy="intent"
              className="mt-5 flex min-h-[50px] w-full items-center justify-center rounded-full bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-black"
              onClick={closeDrawer}
            >
              {labels.checkout}
            </AppLink>
          ) : null}
        </div>
      </SideSheet>

      {renderTrigger ? (
        renderTrigger({
          open,
          badgeCount,
          label: dictionary.nav.cart,
          openDrawer,
          prefetchDrawerView,
        })
      ) : (
        <button
          type="button"
          onClick={openDrawer}
          onPointerEnter={prefetchDrawerView}
          onFocus={prefetchDrawerView}
          className="inline-flex h-11 items-center gap-1 rounded-lg px-1 text-gray-700 transition-colors hover:text-gray-900"
          aria-label={dictionary.nav.cart}
          aria-expanded={open}
          data-cart-fly-target
        >
          <span className="relative inline-flex h-11 w-11 items-center justify-center">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {badgeCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-semibold text-white">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            ) : null}
          </span>
        </button>
      )}
    </>
  );
}
