import { notFound } from 'next/navigation';

import { ADMIN_PAGE_SUBTITLE, ADMIN_PAGE_TITLE } from '@/features/admin/ui/admin-form-classes';
import { listPromotionTargetOptions } from '@/features/promotions/application/queries';
import { PromotionForm } from '@/features/promotions/ui/PromotionForm';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

type AdminNewDiscountPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminNewDiscountPage({ params }: AdminNewDiscountPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const [targets, dictionary] = await Promise.all([
    listPromotionTargetOptions(),
    Promise.resolve(getDictionary(locale)),
  ]);
  const copy = dictionary.product.variant;

  return (
    <section>
      <div className="mb-6">
        <h1 className={ADMIN_PAGE_TITLE}>{copy.createVariantPromotionTitle}</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>{copy.createVariantPromotionDescription}</p>
      </div>
      <PromotionForm
        locale={locale}
        mode="create"
        initialKind="AUTOMATIC"
        lockKind
        targets={targets}
        targetCopy={dictionary.product.variant}
        redirectTo={`/${locale}/admin/discounts`}
      />
    </section>
  );
}
