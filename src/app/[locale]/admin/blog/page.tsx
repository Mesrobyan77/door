import { notFound } from "next/navigation";

import { listAdminBlogPosts } from "@/features/blog/application/queries";
import { AdminBlogView } from "@/features/blog/ui/AdminBlogView";
import { isLocale } from "@/lib/i18n/config";

type AdminBlogPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminBlogPage({ params }: AdminBlogPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const posts = await listAdminBlogPosts(locale);

  return <AdminBlogView locale={locale} posts={posts} />;
}
