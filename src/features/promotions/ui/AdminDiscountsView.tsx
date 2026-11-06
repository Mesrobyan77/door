"use client";

import type { AdminDiscountsBoard } from "@/features/promotions/application/discounts-board";
import { CategoryDiscountsSection } from "@/features/promotions/ui/CategoryDiscountsSection";
import { DiscountInfoCard } from "@/features/promotions/ui/DiscountInfoCard";
import { GlobalDiscountCard } from "@/features/promotions/ui/GlobalDiscountCard";
import { ProductDiscountsSection } from "@/features/promotions/ui/ProductDiscountsSection";

type AdminDiscountsViewProps = {
  locale: string;
  board: AdminDiscountsBoard;
};

export function AdminDiscountsView({
  locale,
  board,
}: AdminDiscountsViewProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid w-full gap-6 lg:grid-cols-2">
        <GlobalDiscountCard
          locale={locale}
          initialPercent={board.globalPercent}
        />
        <DiscountInfoCard locale={locale} />
      </div>

      <CategoryDiscountsSection
        locale={locale}
        categories={board.categories}
      />

      <ProductDiscountsSection locale={locale} products={board.products} />
    </div>
  );
}
