"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_SECTION_TITLE,
} from "@/features/admin/ui/admin-form-classes";
import { ADMIN_BADGE } from "@/features/admin/ui/status-badge";
import type { AdminHeroSlideListItem } from "@/features/hero/application/queries";
import { HeroSlideControls } from "@/features/hero/ui/HeroSlideControls";
import { HeroSlideModal } from "@/features/hero/ui/HeroSlideModal";

type AdminHeroViewProps = {
  locale: string;
  slides: AdminHeroSlideListItem[];
  initialEditId?: string;
};

export function AdminHeroView({
  locale,
  slides,
  initialEditId,
}: AdminHeroViewProps) {
  const initialSlide =
    initialEditId != null
      ? (slides.find((slide) => slide.id === initialEditId) ?? null)
      : null;
  const [modalOpen, setModalOpen] = useState(initialSlide != null);
  const [editingSlide, setEditingSlide] =
    useState<AdminHeroSlideListItem | null>(initialSlide);

  function openCreate(): void {
    setEditingSlide(null);
    setModalOpen(true);
  }

  function openEdit(slide: AdminHeroSlideListItem): void {
    setEditingSlide(slide);
    setModalOpen(true);
  }

  function closeModal(): void {
    setModalOpen(false);
    setEditingSlide(null);
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Hero slides</h1>
          <p className={`mt-1 ${ADMIN_PAGE_SUBTITLE}`}>
            {slides.length} slide{slides.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          Create hero slide
        </Button>
      </div>

      <div className="mb-4">
        <h2 className={ADMIN_SECTION_TITLE}>Slides ({slides.length})</h2>
      </div>

      <div className="space-y-3">
        {slides.map((slide) => (
          <Card key={slide.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 gap-3">
                {slide.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                  <img
                    src={slide.imageUrl}
                    alt=""
                    className="h-16 w-24 shrink-0 rounded-lg border border-gray-200 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400">
                    No image
                  </div>
                )}
                <div className="min-w-0">
                  <p>
                    <button
                      type="button"
                      onClick={() => openEdit(slide)}
                      className="text-left font-medium text-gray-900 hover:underline"
                    >
                      {slide.title}
                    </button>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">
                      sort {slide.sortOrder}
                    </span>
                    <span
                      className={`${ADMIN_BADGE} ${
                        slide.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {slide.isActive ? "PUBLISHED" : "DRAFT"}
                    </span>
                  </div>
                  {slide.subtitle ? (
                    <p className="mt-1 text-sm text-gray-600">{slide.subtitle}</p>
                  ) : null}
                </div>
              </div>
              <HeroSlideControls
                locale={locale}
                slideId={slide.id}
                slideTitle={slide.title}
                isActive={slide.isActive}
                onEdit={() => openEdit(slide)}
              />
            </div>
          </Card>
        ))}
        {slides.length === 0 ? (
          <Card className="p-6">
            <p className="text-center text-sm text-gray-600">
              No hero slides yet.
            </p>
          </Card>
        ) : null}
      </div>

      <HeroSlideModal
        locale={locale}
        open={modalOpen}
        onClose={closeModal}
        slide={editingSlide}
      />
    </section>
  );
}

