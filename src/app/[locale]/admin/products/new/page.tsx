import { redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";

type NewProductPageProps = { params: Promise<{ locale: string }> };

/** Legacy create route — product create/edit now opens as a right drawer. */
export default async function NewProductPage({ params }: NewProductPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    redirect("/");
  }
  redirect(`/${locale}/admin/products`);
}
