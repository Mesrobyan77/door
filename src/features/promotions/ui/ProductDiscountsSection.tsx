"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { ADMIN_INPUT } from "@/features/admin/ui/admin-form-classes";
import { AdminSearchInput } from "@/features/admin/ui/AdminSearchInput";
import type { DiscountBoardProduct } from "@/features/promotions/application/discounts-board";
import { upsertTargetDiscountAction } from "@/features/promotions/application/manage-discounts";
import { currencySymbols, isCurrency } from "@/lib/money/currency";
import { useSyncedState } from "@/lib/react/sync-state-from-prop";

type ProductDiscountsSectionProps = {
  locale: string;
  products: DiscountBoardProduct[];
};

function formatPrice(amount: number, currency = "AMD"): string {
  const symbol = isCurrency(currency) ? currencySymbols[currency] : currency;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

function parsePercent(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const next = Number(trimmed);
  if (!Number.isInteger(next) || next < 1 || next > 100) return "invalid";
  return next;
}

function draftsFromProducts(
  products: DiscountBoardProduct[],
): Record<string, string> {
  return Object.fromEntries(
    products.map((product) => [
      product.id,
      product.discountPercent != null ? String(product.discountPercent) : "",
    ]),
  );
}

export function ProductDiscountsSection({
  locale,
  products,
}: ProductDiscountsSectionProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const sourceDrafts = useMemo(() => draftsFromProducts(products), [products]);
  const [drafts, setDrafts] = useSyncedState(sourceDrafts);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(needle) ||
        product.slug.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle),
    );
  }, [products, query]);

  function saveOne(productId: string, title: string): void {
    const parsed = parsePercent(drafts[productId] ?? "");
    if (parsed === "invalid") {
      setError(`Invalid percentage for “${title}”. Use 1–100.`);
      return;
    }

    setSavingId(productId);
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await upsertTargetDiscountAction(locale, {
        target: "product",
        targetId: productId,
        percentage: parsed,
      });
      setSavingId(null);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setMessage(
        parsed == null
          ? `Cleared discount for “${title}”.`
          : `Saved ${parsed}% for “${title}”.`,
      );
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Product Discounts
        </h2>
        <p className="text-sm text-gray-500">
          Set individual discount percentage for each product
        </p>
      </div>

      <label className="sr-only" htmlFor="product-discount-search">
        Search products
      </label>
      <AdminSearchInput
        id="product-discount-search"
        placeholder="Search by title or slug..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        wrapperClassName="mb-4"
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
          No products found
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((product) => {
            const busy = isPending && savingId === product.id;
            return (
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {product.imageUrl ? (
                    // Admin/R2 hosts vary — native img avoids brittle next/image allowlists.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span
                      className="h-12 w-12 shrink-0 rounded-md bg-gray-100"
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {product.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPrice(product.priceAmount)} · {product.sku}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    className="sr-only"
                    htmlFor={`product-discount-${product.id}`}
                  >
                    Discount for {product.title}
                  </label>
                  <input
                    id={`product-discount-${product.id}`}
                    type="number"
                    min={0}
                    max={100}
                    inputMode="numeric"
                    disabled={isPending}
                    value={drafts[product.id] ?? ""}
                    onChange={(event) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [product.id]: event.target.value,
                      }))
                    }
                    className={`${ADMIN_INPUT} w-20`}
                  />
                  <span className="text-sm text-gray-500">%</span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => saveOne(product.id, product.title)}
                  >
                    {busy ? "Saving…" : "Save"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
    </section>
  );
}
