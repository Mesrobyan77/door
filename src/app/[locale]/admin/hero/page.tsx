import { notFound } from "next/navigation";

import { listAdminHeroSlides } from "@/features/hero/application/queries";
import { AdminHeroView } from "@/features/hero/ui/AdminHeroView";
import { isLocale } from "@/lib/i18n/config";

type AdminHeroPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function AdminHeroPage({
  params,
  searchParams,
}: AdminHeroPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const { edit } = await searchParams;
  const slides = await listAdminHeroSlides();

  return (
    <AdminHeroView locale={locale} slides={slides} initialEditId={edit} />
  );
}

