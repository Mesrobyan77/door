"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ConfirmDialog,
  deleteConfirmDescription,
} from "@/components/ui/ConfirmDialog";
import {
  ADMIN_TABLE,
  ADMIN_TABLE_CARD,
  ADMIN_TABLE_CHECKBOX,
  ADMIN_TABLE_OUTER_SCROLL,
  ADMIN_TABLE_STATE_INSET,
  ADMIN_TABLE_TBODY,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_TH_CENTER,
  ADMIN_TABLE_TH_CHECK,
  ADMIN_TABLE_THEAD,
} from "@/features/admin/ui/admin-table-classes";
import {
  duplicateProductAction,
  softDeleteProductsAction,
  toggleProductFeaturedAction,
  toggleProductVisibilityAction,
} from "@/features/products/application/admin-product-actions";
import type { AdminProductListItem } from "@/features/products/application/list-admin-products";
import { AdminProductRow } from "@/features/products/ui/AdminProductRow";

type AdminProductsSortLinks = {
  title: string;
  stock: string;
  price: string;
  created: string;
};

type AdminProductsTableProps = {
  locale: string;
  products: AdminProductListItem[];
  sortLinks: AdminProductsSortLinks;
  onEdit: (product: AdminProductListItem) => void;
};

export function AdminProductsTable({
  locale,
  products,
  sortLinks,
  onEdit,
}: AdminProductsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "single" | "bulk";
    productIds: string[];
    label: string;
  } | null>(null);

  const allIds = products.map((product) => product.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleOne(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(): void {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function runAction(action: () => Promise<void>): void {
    startTransition(async () => {
      setError(null);
      try {
        await action();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Action failed.");
      }
    });
  }

  function deleteSelected(): void {
    if (selected.size === 0) return;
    const count = selected.size;
    setPendingDelete({
      kind: "bulk",
      productIds: [...selected],
      label:
        count === 1
          ? "selected product"
          : `${count} selected products`,
    });
  }

  function confirmDelete(): void {
    if (!pendingDelete) return;
    const productIds = pendingDelete.productIds;
    startTransition(async () => {
      setError(null);
      try {
        const result = await softDeleteProductsAction(locale, { productIds });
        if (!result.ok) throw new Error(result.error.message);
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of productIds) next.delete(id);
          return next;
        });
        setPendingDelete(null);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Action failed.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-gray-700">
          Selected {selected.size} product{selected.size === 1 ? "" : "s"}
        </p>
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={isPending || selected.size === 0}
          onClick={deleteSelected}
        >
          Delete Selected
        </Button>
      </Card>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Card className={ADMIN_TABLE_CARD}>
        {products.length === 0 ? (
          <p className={`${ADMIN_TABLE_STATE_INSET} text-sm text-gray-600`}>
            No products match these filters.
          </p>
        ) : (
          <div className={ADMIN_TABLE_OUTER_SCROLL}>
            <table className={ADMIN_TABLE}>
              <thead className={ADMIN_TABLE_THEAD}>
                <tr>
                  <th className={ADMIN_TABLE_TH_CHECK}>
                    <input
                      type="checkbox"
                      className={ADMIN_TABLE_CHECKBOX}
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={isPending}
                      aria-label="Select all products"
                    />
                  </th>
                  <th className={ADMIN_TABLE_TH}>
                    <Link href={sortLinks.title} className="hover:text-gray-900">
                      Product
                    </Link>
                  </th>
                  <th className={ADMIN_TABLE_TH}>
                    <Link href={sortLinks.stock} className="hover:text-gray-900">
                      Stock
                    </Link>
                  </th>
                  <th className={ADMIN_TABLE_TH}>
                    <Link href={sortLinks.price} className="hover:text-gray-900">
                      Price
                    </Link>
                  </th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Category</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Featured</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Actions</th>
                  <th className={ADMIN_TABLE_TH}>
                    <Link
                      href={sortLinks.created}
                      className="hover:text-gray-900"
                    >
                      Created
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody className={ADMIN_TABLE_TBODY}>
                {products.map((product) => (
                  <AdminProductRow
                    key={product.id}
                    locale={locale}
                    product={product}
                    selected={selected.has(product.id)}
                    disabled={isPending}
                    onToggle={() => toggleOne(product.id)}
                    onEdit={() => onEdit(product)}
                    onFeatured={() =>
                      runAction(async () => {
                        const result = await toggleProductFeaturedAction(
                          locale,
                          product.id,
                        );
                        if (!result.ok) throw new Error(result.error.message);
                      })
                    }
                    onDuplicate={() =>
                      runAction(async () => {
                        const result = await duplicateProductAction(
                          locale,
                          product.id,
                        );
                        if (!result.ok) throw new Error(result.error.message);
                      })
                    }
                    onDelete={() =>
                      setPendingDelete({
                        kind: "single",
                        productIds: [product.id],
                        label: product.title,
                      })
                    }
                    onVisibility={() =>
                      runAction(async () => {
                        const result = await toggleProductVisibilityAction(
                          locale,
                          product.id,
                        );
                        if (!result.ok) throw new Error(result.error.message);
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete"
        description={
          pendingDelete?.kind === "bulk"
            ? `Are you sure you want to delete ${pendingDelete.label}? This action cannot be undone.`
            : pendingDelete
              ? deleteConfirmDescription("product", pendingDelete.label)
              : ""
        }
        isPending={isPending}
        onClose={() => {
          if (!isPending) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
