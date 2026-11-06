import { notFound } from "next/navigation";

import { ADMIN_PAGE_TITLE } from "@/features/admin/ui/admin-form-classes";
import { getAdminDiscountsBoard } from "@/features/promotions/application/discounts-board";
import { AdminDiscountsView } from "@/features/promotions/ui/AdminDiscountsView";
import { isLocale } from "@/lib/i18n/config";

type AdminDiscountsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminDiscountsPage({
  params,
}: AdminDiscountsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const board = await getAdminDiscountsBoard(locale);

  return (
    <section className="w-full">
      <div className="mb-6">
        <h1 className={ADMIN_PAGE_TITLE}>Discounts</h1>
      </div>

      <AdminDiscountsView locale={locale} board={board} />
    </section>
  );
}
