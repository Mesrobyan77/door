"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { ADMIN_INPUT } from "@/features/admin/ui/admin-form-classes";
import type { DiscountBoardCategory } from "@/features/promotions/application/discounts-board";
import { saveCategoryDiscountsAction } from "@/features/promotions/application/manage-discounts";
import { useSyncedState } from "@/lib/react/sync-state-from-prop";

type CategoryDiscountsSectionProps = {
  locale: string;
  categories: DiscountBoardCategory[];
};

function parsePercent(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const next = Number(trimmed);
  if (!Number.isInteger(next) || next < 1 || next > 100) return "invalid";
  return next;
}

function draftsFromCategories(
  categories: DiscountBoardCategory[],
): Record<string, string> {
  return Object.fromEntries(
    categories.map((category) => [
      category.id,
      category.discountPercent != null
        ? String(category.discountPercent)
        : "",
    ]),
  );
}

export function CategoryDiscountsSection({
  locale,
  categories,
}: CategoryDiscountsSectionProps) {
  const router = useRouter();
  const sourceDrafts = useMemo(
    () => draftsFromCategories(categories),
    [categories],
  );
  const [drafts, setDrafts] = useSyncedState(sourceDrafts);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty = useMemo(() => {
    return categories.some((category) => {
      const draft = drafts[category.id] ?? "";
      const saved =
        category.discountPercent != null
          ? String(category.discountPercent)
          : "";
      return draft !== saved;
    });
  }, [categories, drafts]);

  function saveAll(): void {
    const items: Array<{ categoryId: string; percentage: number | null }> = [];
    for (const category of categories) {
      const parsed = parsePercent(drafts[category.id] ?? "");
      if (parsed === "invalid") {
        setError(`Invalid percentage for “${category.title}”. Use 1–100.`);
        return;
      }
      items.push({ categoryId: category.id, percentage: parsed });
    }

    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await saveCategoryDiscountsAction(locale, { items });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setMessage(`Saved ${result.value.saved} category discount(s).`);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Category Discounts
          </h2>
          <p className="text-sm text-gray-500">
            Apply discounts to each product within a category
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isPending || !isDirty || categories.length === 0}
          onClick={saveAll}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
          No categories found
        </div>
      ) : (
        <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {category.title}
                </p>
                <p className="text-xs text-gray-500">{category.parentLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`cat-discount-${category.id}`}>
                  Discount for {category.title}
                </label>
                <input
                  id={`cat-discount-${category.id}`}
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  disabled={isPending}
                  value={drafts[category.id] ?? ""}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [category.id]: event.target.value,
                    }))
                  }
                  className={`${ADMIN_INPUT} w-20`}
                />
                <span className="text-sm text-gray-500">%</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    setDrafts((prev) => ({ ...prev, [category.id]: "" }))
                  }
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
    </section>
  );
}
