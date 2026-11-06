'use client';

import Link from 'next/link';

import type { AdminDiscountsBoard } from '@/features/promotions/application/discounts-board';
import { CategoryDiscountsSection } from '@/features/promotions/ui/CategoryDiscountsSection';
import { DiscountInfoCard } from '@/features/promotions/ui/DiscountInfoCard';
import { GlobalDiscountCard } from '@/features/promotions/ui/GlobalDiscountCard';
import { ProductDiscountsSection } from '@/features/promotions/ui/ProductDiscountsSection';
import type { Dictionary } from '@/lib/i18n/get-dictionary';

type AdminDiscountsViewProps = {
  locale: string;
  board: AdminDiscountsBoard;
  inquiryLabel: string;
  variantCopy: Pick<
    Dictionary['product']['variant'],
    | 'variantPromotionSection'
    | 'createVariantPromotion'
    | 'noVariantPromotions'
    | 'editVariantPromotion'
  >;
};

export function AdminDiscountsView({
  locale,
  board,
  inquiryLabel,
  variantCopy,
}: AdminDiscountsViewProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid w-full gap-6 lg:grid-cols-2">
        <GlobalDiscountCard locale={locale} initialPercent={board.globalPercent} />
        <DiscountInfoCard locale={locale} />
      </div>

      <CategoryDiscountsSection locale={locale} categories={board.categories} />

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {variantCopy.variantPromotionSection}
          </h2>
          <Link
            href={`/${locale}/admin/discounts/new`}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {variantCopy.createVariantPromotion}
          </Link>
        </div>
        {board.variantPromotions.length === 0 ? (
          <p className="text-sm text-gray-600">{variantCopy.noVariantPromotions}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {board.variantPromotions.map((promotion) => (
              <li
                key={promotion.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span className="text-sm font-medium text-gray-800">
                  {promotion.productTitle} · {promotion.sku}
                </span>
                <span className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-red-700">-{promotion.discountPercent}%</span>
                  <Link
                    href={`/${locale}/admin/discounts/${promotion.id}`}
                    className="font-medium text-gray-700 underline"
                  >
                    {variantCopy.editVariantPromotion}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProductDiscountsSection
        locale={locale}
        products={board.products}
        inquiryLabel={inquiryLabel}
      />
    </div>
  );
}
