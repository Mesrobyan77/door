import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
} from "@/features/admin/ui/admin-form-classes";
import {
  getAdminPromotionById,
  listPromotionTargetOptions,
} from "@/features/promotions/application/queries";
import { PromotionForm } from "@/features/promotions/ui/PromotionForm";
import { isLocale } from "@/lib/i18n/config";

type AdminCouponDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminCouponDetailPage({
  params,
}: AdminCouponDetailPageProps) {
  const { locale, id } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const [promo, targets] = await Promise.all([
    getAdminPromotionById(id),
    listPromotionTargetOptions(),
  ]);

  if (!promo || promo.kind !== "COUPON") {
    notFound();
  }

  return (
    <section>
      <div className="mb-6">
        <p className={`mb-1 ${ADMIN_PAGE_SUBTITLE}`}>
          <Link
            href={`/${locale}/admin/coupons`}
            className="font-medium text-gray-700 hover:underline"
          >
            Coupons
          </Link>
        </p>
        <h1 className={ADMIN_PAGE_TITLE}>{promo.code}</h1>
        <p className={`mt-1 ${ADMIN_PAGE_SUBTITLE}`}>
          Used {promo.usedCount} times
        </p>
      </div>

      <PromotionForm
        locale={locale}
        mode="edit"
        promotionId={promo.id}
        initialKind="COUPON"
        lockKind
        targets={targets}
        redirectTo={`/${locale}/admin/coupons`}
        defaults={{
          code: promo.code,
          productId: promo.productId,
          categoryId: promo.categoryId,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          maxDiscountAmount: promo.maxDiscountAmount,
          minimumOrderAmount: promo.minimumOrderAmount,
          totalUsageLimit: promo.totalUsageLimit,
          perUserUsageLimit: promo.perUserUsageLimit,
          priority: promo.priority,
          allowStacking: promo.allowStacking,
          isActive: promo.isActive,
          startsAt: promo.startsAt,
          endsAt: promo.endsAt,
        }}
      />
    </section>
  );
}
