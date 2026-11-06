"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, useTransition } from "react";

import {
  ADMIN_INPUT,
  ADMIN_LABEL,
} from "@/features/admin/ui/admin-form-classes";
import { createCategoryAction } from "@/features/categories/actions";
import { slugifyCategoryTitle } from "@/features/categories/domain/slugify";
import type { AdminCategoryOption } from "@/features/products/application/list-admin-products";

type ProductDrawerCategoriesProps = {
  locale: string;
  categories: AdminCategoryOption[];
  selectedIds: string[];
  disabled: boolean;
  onCategoriesChange: (categories: AdminCategoryOption[]) => void;
  onSelectedChange: (ids: string[]) => void;
};

export function ProductDrawerCategories({
  locale,
  categories,
  selectedIds,
  disabled,
  onCategoriesChange,
  onSelectedChange,
}: ProductDrawerCategoriesProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTitles = categories
    .filter((category) => selectedIds.includes(category.id))
    .map((category) => category.title);
  const triggerLabel =
    selectedTitles.length === 0
      ? "Select categories"
      : selectedTitles.join(", ");

  function toggleCategory(id: string): void {
    if (selectedIds.includes(id)) {
      onSelectedChange(selectedIds.filter((value) => value !== id));
      return;
    }
    onSelectedChange([...selectedIds, id]);
  }

  function createCategory(): void {
    const title = newTitle.trim();
    if (!title) {
      setError("Category title is required.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await createCategoryAction(locale, {
        title,
        slug: slugifyCategoryTitle(title),
        parentId: null,
        status: "ACTIVE",
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      const created = { id: result.value.id, title };
      onCategoriesChange([...categories, created]);
      onSelectedChange([...selectedIds, created.id]);
      setNewTitle("");
      setShowAdd(false);
      setOpen(true);
    });
  }

  return (
    <div>
      <span className={ADMIN_LABEL}>Categories</span>
      <div className={`relative mt-1 ${open ? "z-50" : "z-0"}`}>
        <button
          type="button"
          disabled={disabled || isPending}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className={`${ADMIN_INPUT} flex items-center justify-between gap-2 pr-3 text-left disabled:opacity-50`}
        >
          <span
            className={`min-w-0 flex-1 truncate ${
              selectedTitles.length === 0 ? "text-gray-400" : "text-gray-900"
            }`}
          >
            {triggerLabel}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>

        <div
          className={`absolute top-[calc(100%+0.5rem)] left-0 z-[100] grid w-full transition-[grid-template-rows,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open
              ? "translate-y-0 grid-rows-[1fr] opacity-100"
              : "pointer-events-none -translate-y-1 grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!open}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              id={listId}
              className="max-h-56 overflow-y-auto rounded-2xl border border-gray-100 bg-white py-2"
            >
              {categories.length === 0 ? (
                <p className="px-4 py-2.5 text-sm text-gray-500">
                  No categories yet.
                </p>
              ) : (
                categories.map((category) => {
                  const selected = selectedIds.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      disabled={disabled || isPending}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <span
                        className={
                          selected
                            ? "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-900 bg-gray-900 text-white"
                            : "flex h-4 w-4 shrink-0 rounded border border-gray-300 bg-white"
                        }
                        aria-hidden
                      >
                        {selected ? (
                          <svg
                            viewBox="0 0 12 12"
                            className="h-3 w-3"
                            fill="none"
                          >
                            <path
                              d="M2.5 6.2 4.8 8.5 9.5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                      </span>
                      <span className="min-w-0 truncate">{category.title}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <button
          type="button"
          disabled={disabled || isPending}
          onClick={() => setShowAdd((value) => !value)}
          className="inline-flex items-center rounded-xl border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
        >
          + Add category
        </button>
      </div>

      {showAdd ? (
        <div className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <label className="block">
            <span className={ADMIN_LABEL}>
              Category title <span className="text-red-600">*</span>
            </span>
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Enter category title"
              className={ADMIN_INPUT}
              disabled={disabled || isPending}
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={disabled || isPending || !newTitle.trim()}
              onClick={createCategory}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isPending ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowAdd(false);
                setNewTitle("");
                setError(null);
              }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
