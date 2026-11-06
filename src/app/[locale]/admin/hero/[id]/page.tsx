import { redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";

type AdminHeroDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

/** Edit UI moved to the hero list modal. */
export default async function AdminHeroDetailPage({
  params,
}: AdminHeroDetailPageProps) {
  const { locale, id } = await params;
  if (!isLocale(locale)) {
    redirect("/");
  }

  redirect(`/${locale}/admin/hero?edit=${id}`);
}

