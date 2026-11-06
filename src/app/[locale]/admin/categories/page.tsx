import { notFound } from "next/navigation";

import { listAdminCategories } from "@/features/categories/application/list-admin-categories";
import { AdminCategoriesView } from "@/features/categories/ui/AdminCategoriesView";
import { isLocale } from "@/lib/i18n/config";

type AdminCategoriesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminCategoriesPage({
  params,
}: AdminCategoriesPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const categories = await listAdminCategories(locale);

  return <AdminCategoriesView locale={locale} categories={categories} />;
}
