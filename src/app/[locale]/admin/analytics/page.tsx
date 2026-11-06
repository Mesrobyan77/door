import { notFound } from "next/navigation";

import { ADMIN_PAGE_SUBTITLE } from "@/features/admin/ui/admin-form-classes";
import { getAnalyticsSummary } from "@/features/analytics/application/queries";
import {
  analyticsDateRangeSchema,
  matchAnalyticsPeriodPreset,
  rangeForAnalyticsPeriod,
} from "@/features/analytics/domain/date-range";
import { AnalyticsMetricCards } from "@/features/analytics/ui/AnalyticsMetricCards";
import { AnalyticsOrdersByDay } from "@/features/analytics/ui/AnalyticsOrdersByDay";
import { AnalyticsPeriodCard } from "@/features/analytics/ui/AnalyticsPeriodCard";
import { AnalyticsTopRankings } from "@/features/analytics/ui/AnalyticsTopRankings";
import { isLocale } from "@/lib/i18n/config";
import { formatMoneyAmount } from "@/lib/money/format";

type AdminAnalyticsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function AdminAnalyticsPage({
  params,
  searchParams,
}: AdminAnalyticsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const raw = await searchParams;
  const defaults = rangeForAnalyticsPeriod("last_7_days");
  const parsed = analyticsDateRangeSchema.safeParse({
    from: firstParam(raw.from) ?? defaults.from,
    to: firstParam(raw.to) ?? defaults.to,
  });

  const range = parsed.success ? parsed.data : defaults;
  const preset = matchAnalyticsPeriodPreset(range);
  const summary = await getAnalyticsSummary({ ...range, locale });
  const exportQuery = new URLSearchParams({
    from: range.from,
    to: range.to,
  }).toString();

  const formatMoney = (amount: number): string =>
    formatMoneyAmount(amount, "AMD", locale);

  return (
    <section>
      <div className="mb-6">
        <p className={ADMIN_PAGE_SUBTITLE}>
          Track your business performance and statistics
        </p>
      </div>

      <AnalyticsPeriodCard
        key={`${range.from}:${range.to}`}
        locale={locale}
        from={range.from}
        to={range.to}
        preset={preset}
        exportQuery={exportQuery}
        rangeInvalid={!parsed.success}
      />

      <AnalyticsMetricCards
        orderCount={summary.orderCount}
        revenueLabel={formatMoney(summary.revenueAmount)}
        userCount={summary.userCount}
      />

      <AnalyticsTopRankings
        products={summary.topProducts}
        categories={summary.topCategories}
        formatMoney={formatMoney}
      />

      <AnalyticsOrdersByDay
        rows={summary.dailyRows}
        formatMoney={formatMoney}
      />
    </section>
  );
}
