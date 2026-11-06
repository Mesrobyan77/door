import { CheckCircle2, Clock3, Package, Wallet } from "lucide-react";
import { notFound } from "next/navigation";

import { getProfileDashboard } from "@/features/profile/application/dashboard-queries";
import { ProfileDashboardOrdersSection } from "@/features/profile/ui/ProfileDashboardOrdersSection";
import { ProfileStatCard } from "@/features/profile/ui/ProfileStatCard";
import { requireUser } from "@/lib/auth/policies";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { formatMoneyAmount } from "@/lib/money/format";

type ProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const user = await requireUser(locale);
  const dictionary = getDictionary(locale);
  const { stats, recentOrders } = await getProfileDashboard(user.id);
  const copy = dictionary.profile;

  return (
    <section className="profile-sheet-keep-frame space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:hidden">
          {copy.dashboard}
        </h1>
        <p className="mt-2 text-sm text-gray-600 lg:mt-0">
          {copy.welcome}, {user.firstName}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <ProfileStatCard
          label={copy.totalOrders}
          value={String(stats.totalOrders)}
          icon={<Package aria-hidden />}
        />
        <ProfileStatCard
          label={copy.totalSpent}
          value={formatMoneyAmount(stats.totalSpent, "AMD", locale)}
          icon={<Wallet aria-hidden />}
        />
        <ProfileStatCard
          label={copy.pendingOrders}
          value={String(stats.pendingOrders)}
          icon={<Clock3 aria-hidden />}
        />
        <ProfileStatCard
          label={copy.completedOrders}
          value={String(stats.completedOrders)}
          icon={<CheckCircle2 aria-hidden />}
        />
      </div>

      <ProfileDashboardOrdersSection
        locale={locale}
        orders={recentOrders}
        labels={{
          recentOrders: copy.recentOrders,
          viewAllOrders: copy.viewAllOrders,
          noOrders: copy.noOrders,
          startShopping: copy.startShopping,
          orderNumber: copy.orderNumber,
          viewDetails: copy.viewDetails,
          placedOn: copy.placedOn,
          item: copy.item,
          items: copy.items,
        }}
      />
    </section>
  );
}
