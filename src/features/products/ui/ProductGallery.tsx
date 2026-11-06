"use client";

import Image from "next/image";
import { useState } from "react";

import type { ProductGalleryImage } from "@/features/products/types";

type ProductGalleryProps = {
  images: ProductGalleryImage[];
  title: string;
  discountPercent?: number | null;
  inStock: boolean;
  outOfStockLabel: string;
};

export function ProductGallery({
  images,
  title,
  discountPercent = null,
  inStock,
  outOfStockLabel,
}: ProductGalleryProps) {
  const [selectedId, setSelectedId] = useState(images[0]?.id ?? null);
  const selected =
    images.find((image) => image.id === selectedId) ?? images[0] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative flex h-80 w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 sm:h-[28rem] lg:h-[32rem]"
        data-product-detail-fly-source
        data-cart-fly-source
      >
        {selected ? (
          <Image
            src={selected.url}
            alt={selected.alt || title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-4"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            No image
          </div>
        )}
        {discountPercent != null ? (
          <span className="absolute top-3 right-3 z-10 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
            -{discountPercent}%
          </span>
        ) : null}
        {!inStock ? (
          <span className="absolute top-3 left-3 z-10 rounded bg-gray-900/90 px-2 py-1 text-xs font-semibold text-white">
            {outOfStockLabel}
          </span>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul className="flex flex-wrap gap-2" role="list">
          {images.map((image) => {
            const isActive = image.id === selected?.id;
            return (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(image.id)}
                  aria-label={image.alt || title}
                  aria-pressed={isActive}
                  className={`relative h-16 w-16 overflow-hidden rounded-md border bg-gray-100 transition ${
                    isActive
                      ? "border-gray-900 ring-2 ring-gray-900/20"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
