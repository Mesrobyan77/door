import { notFound } from "next/navigation";

import { AdminShell } from "@/features/admin/ui/AdminShell";
import { requireAdmin } from "@/lib/auth/policies";
import { isLocale } from "@/lib/i18n/config";

type AdminLayoutProps = {
  children: React.ReactNode;
  params: Promise<unknown>;
};

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const { locale } = (await params) as { locale: string };
  if (!isLocale(locale)) notFound();
  await requireAdmin(locale);

  return <AdminShell locale={locale}>{children}</AdminShell>;
}
