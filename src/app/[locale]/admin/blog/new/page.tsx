import { redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";

type AdminNewBlogPageProps = {
  params: Promise<{ locale: string }>;
};

/** Create UI moved to the blog list drawer. */
export default async function AdminNewBlogPage({
  params,
}: AdminNewBlogPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    redirect("/hy/admin/blog");
  }
  redirect(`/${locale}/admin/blog`);
}
