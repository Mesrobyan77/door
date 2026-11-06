import { redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";

type AdminBlogDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

/** Edit UI moved to the blog list drawer. */
export default async function AdminBlogDetailPage({
  params,
}: AdminBlogDetailPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    redirect("/hy/admin/blog");
  }
  redirect(`/${locale}/admin/blog`);
}
