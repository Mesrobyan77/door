import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { MobileBottomNavIsland } from "@/components/layout/MobileBottomNavIsland";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MaintenanceGate } from "@/components/layout/MaintenanceGate";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import {
  CURRENCY_COOKIE_NAME,
  parseCurrencyCookie,
} from "@/lib/money/currency-cookie";

type StorefrontLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function StorefrontLayout({
  children,
  params,
}: StorefrontLayoutProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const dictionary = getDictionary(locale);
  const cookieStore = await cookies();
  const currency = parseCurrencyCookie(
    cookieStore.get(CURRENCY_COOKIE_NAME)?.value,
  );

  return (
    <div className="storefront-shell flex min-h-dvh flex-1 flex-col bg-gray-50">
      <SiteHeader
        locale={locale}
        currency={currency}
        dictionary={dictionary}
      />
      <main className="storefront-main mx-auto w-full max-w-7xl flex-1 px-4 py-10 pb-24 sm:px-6 md:pb-10 lg:px-8">
        <MaintenanceGate>{children}</MaintenanceGate>
      </main>
      <SiteFooter dictionary={dictionary} locale={locale} />
      <MobileBottomNavIsland
        locale={locale}
        currency={currency}
        dictionary={dictionary}
      />
    </div>
  );
}
