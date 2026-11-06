"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SideSheet } from "@/components/ui/SideSheet";
import {
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_TEXTAREA,
} from "@/features/admin/ui/admin-form-classes";
import type {
  AdminCategoryOption,
  AdminProductListItem,
} from "@/features/products/application/list-admin-products";
import {
  createProductFromDrawerAction,
  updateProductFromDrawerAction,
} from "@/features/products/application/upsert-product";
import { ProductDrawerCategories } from "@/features/products/ui/ProductDrawerCategories";
import {
  ProductDrawerImages,
  type ProductDraftImage,
} from "@/features/products/ui/ProductDrawerImages";

type ProductDrawerProduct = Pick<
  AdminProductListItem,
  | "id"
  | "sku"
  | "title"
  | "slug"
  | "description"
  | "priceAmount"
  | "compareAtAmount"
  | "stockOnHand"
  | "status"
  | "categoryIds"
  | "images"
>;

type ProductDrawerProps = {
  locale: string;
  open: boolean;
  onClose: () => void;
  product?: ProductDrawerProduct | null;
  categories: AdminCategoryOption[];
};

function imagesFromProduct(
  product: ProductDrawerProduct | null,
): ProductDraftImage[] {
  if (!product) return [];
  return product.images.map((image) => ({
    key: image.id,
    previewUrl: image.url,
    isPrimary: image.isPrimary,
    existingId: image.id,
  }));
}

export function ProductDrawer({
  locale,
  open,
  onClose,
  product = null,
  categories: initialCategories,
}: ProductDrawerProps) {
  const router = useRouter();
  const isEdit = product != null;
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ProductDraftImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [categories, setCategories] =
    useState<AdminCategoryOption[]>(initialCategories);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [priceAmount, setPriceAmount] = useState("");
  const [compareAtAmount, setCompareAtAmount] = useState("");
  const [sku, setSku] = useState("");
  const [stockOnHand, setStockOnHand] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevProduct, setPrevProduct] = useState(product);
  const [prevCategories, setPrevCategories] = useState(initialCategories);

  if (
    open !== prevOpen ||
    product !== prevProduct ||
    initialCategories !== prevCategories
  ) {
    setPrevOpen(open);
    setPrevProduct(product);
    setPrevCategories(initialCategories);
    if (open) {
      setCategories(initialCategories);
      if (product) {
        setTitle(product.title);
        setSlug(product.slug);
        setDescription(product.description);
        setImages(imagesFromProduct(product));
        setRemovedImageIds([]);
        setCategoryIds(product.categoryIds);
        setPriceAmount(String(product.priceAmount));
        setCompareAtAmount(
          product.compareAtAmount != null
            ? String(product.compareAtAmount)
            : "",
        );
        setSku(product.sku);
        setStockOnHand(String(product.stockOnHand));
        setError(null);
      } else {
        setTitle("");
        setSlug("");
        setDescription("");
        setImages([]);
        setRemovedImageIds([]);
        setCategoryIds([]);
        setPriceAmount("");
        setCompareAtAmount("");
        setSku("");
        setStockOnHand("");
        setError(null);
      }
    }
  }

  function handleImagesChange(next: ProductDraftImage[]): void {
    const nextKeys = new Set(next.map((image) => image.key));
    const removedExisting = images
      .filter(
        (image) =>
          image.existingId &&
          !nextKeys.has(image.key) &&
          !removedImageIds.includes(image.existingId),
      )
      .map((image) => image.existingId as string);
    if (removedExisting.length > 0) {
      setRemovedImageIds((prev) => [...prev, ...removedExisting]);
    }
    setImages(next);
  }

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      ariaLabel={isEdit ? "Edit product" : "Add new product"}
      panelClassName="w-[min(100%,42rem)] sm:w-[40%]"
    >
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit product" : "Add new product"}
          </h2>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            const newImages = images.filter((image) => image.file);
            const primaryImage = images.find((image) => image.isPrimary);
            const primaryNewIndex = primaryImage?.file
              ? newImages.findIndex((image) => image.key === primaryImage.key)
              : null;

            const payload = {
              sku: sku.trim(),
              title: title.trim(),
              slug: slug.trim(),
              description: description.trim() || undefined,
              priceAmount: Number(priceAmount),
              compareAtAmount: compareAtAmount.trim()
                ? Number(compareAtAmount)
                : null,
              stockOnHand: Number(stockOnHand),
              categoryIds,
              status: (product?.status === "ACTIVE" ||
              product?.status === "ARCHIVED"
                ? product.status
                : "DRAFT") as "DRAFT" | "ACTIVE" | "ARCHIVED",
              primaryExistingId: primaryImage?.existingId ?? null,
              primaryNewIndex:
                primaryNewIndex != null && primaryNewIndex >= 0
                  ? primaryNewIndex
                  : null,
              removeImageIds: removedImageIds,
            };

            const formData = new FormData();
            formData.set("data", JSON.stringify(payload));
            for (const image of newImages) {
              if (image.file) formData.append("images", image.file);
            }

            startTransition(async () => {
              setError(null);
              const result =
                isEdit && product
                  ? await updateProductFromDrawerAction(
                      locale,
                      product.id,
                      formData,
                    )
                  : await createProductFromDrawerAction(locale, formData);

              if (!result.ok) {
                setError(result.error.message);
                return;
              }

              onClose();
              router.refresh();
            });
          }}
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={ADMIN_LABEL}>
                  Title <span className="text-red-600">*</span>
                </span>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Product title"
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>
                  Slug <span className="text-red-600">*</span>
                </span>
                <input
                  required
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="product-slug"
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
            </div>

            <label className="block">
              <span className={ADMIN_LABEL}>Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Product description"
                className={ADMIN_TEXTAREA}
                disabled={isPending}
              />
            </label>

            <ProductDrawerImages
              images={images}
              disabled={isPending}
              onChange={handleImagesChange}
            />

            <ProductDrawerCategories
              locale={locale}
              categories={categories}
              selectedIds={categoryIds}
              disabled={isPending}
              onCategoriesChange={setCategories}
              onSelectedChange={setCategoryIds}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={ADMIN_LABEL}>
                  Price <span className="text-red-600">*</span>
                </span>
                <input
                  required
                  min={0}
                  type="number"
                  value={priceAmount}
                  onChange={(event) => setPriceAmount(event.target.value)}
                  placeholder="AMD price"
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>Compare at price</span>
                <input
                  min={0}
                  type="number"
                  value={compareAtAmount}
                  onChange={(event) => setCompareAtAmount(event.target.value)}
                  placeholder="Optional"
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={ADMIN_LABEL}>
                  SKU <span className="text-red-600">*</span>
                </span>
                <input
                  required
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  placeholder="SKU"
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>
                  Quantity <span className="text-red-600">*</span>
                </span>
                <input
                  required
                  min={0}
                  type="number"
                  value={stockOnHand}
                  onChange={(event) => setStockOnHand(event.target.value)}
                  placeholder="Stock"
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
            </div>

            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </div>

          <div className="sticky bottom-0 flex items-center gap-4 border-t border-gray-200 bg-white px-5 py-4">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save"
                  : "Create"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </form>
    </SideSheet>
  );
}
