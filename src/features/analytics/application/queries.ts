import "server-only";

import {
  and,
  count,
  eq,
  gte,
  inArray,
  lte,
  sql,
} from "drizzle-orm";

import { getProviders } from "@/config/providers";
import { getDb } from "@/db/client";
import { orders, users } from "@/db/schema";
import {
  queryTopCategories,
  queryTopSellingProducts,
  type AnalyticsTopCategory,
  type AnalyticsTopProduct,
} from "@/features/analytics/application/top-rankings";
import type { AnalyticsCsvRow } from "@/features/analytics/domain/csv";
import type { OrderStatus } from "@/features/orders/domain/order-status";
import { getStoreRevenue } from "@/features/settings/application/queries";
import type { Locale } from "@/lib/i18n/config";

export type {
  AnalyticsTopCategory,
  AnalyticsTopProduct,
} from "@/features/analytics/application/top-rankings";
export type { AnalyticsCsvRow } from "@/features/analytics/domain/csv";
export { buildAnalyticsCsv, guardCsvCell } from "@/features/analytics/domain/csv";

const CACHE_TTL_SECONDS = 300;
const cacheKeys = new Set<string>();

export type AnalyticsSummary = {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  orderCount: number;
  revenueAmount: number;
  averageOrderValue: number;
  userCount: number;
  previousOrderCount: number;
  previousRevenueAmount: number;
  previousAverageOrderValue: number;
  dailyRows: AnalyticsCsvRow[];
  topProducts: AnalyticsTopProduct[];
  topCategories: AnalyticsTopCategory[];
};

function periodBounds(from: string, to: string): {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  previousFrom: string;
  previousTo: string;
} {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  const durationMs = Math.max(
    end.getTime() - start.getTime(),
    24 * 60 * 60 * 1000 - 1,
  );
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    start,
    end,
    previousStart,
    previousEnd,
    previousFrom: previousStart.toISOString().slice(0, 10),
    previousTo: previousEnd.toISOString().slice(0, 10),
  };
}

function averageOrderValue(revenue: number, orderCount: number): number {
  if (orderCount === 0) {
    return 0;
  }
  return Math.round((revenue / orderCount) * 100) / 100;
}

function cacheKey(from: string, to: string, locale: Locale): string {
  return `analytics:${locale}:${from}:${to}`;
}

async function queryPeriodMetrics(input: {
  start: Date;
  end: Date;
  revenueStatuses: OrderStatus[];
}): Promise<{ orderCount: number; revenueAmount: number }> {
  const where = and(
    eq(orders.isArchived, false),
    gte(orders.placedAt, input.start),
    lte(orders.placedAt, input.end),
  );

  const [[ordersRow], [revenueRow]] = await Promise.all([
    getDb().select({ value: count() }).from(orders).where(where),
    getDb()
      .select({
        value: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`.mapWith(
          Number,
        ),
      })
      .from(orders)
      .where(and(where, inArray(orders.status, input.revenueStatuses))),
  ]);

  return {
    orderCount: ordersRow?.value ?? 0,
    revenueAmount: revenueRow?.value ?? 0,
  };
}

async function queryDailyRows(input: {
  from: string;
  to: string;
  revenueStatuses: OrderStatus[];
}): Promise<AnalyticsCsvRow[]> {
  const bounds = periodBounds(input.from, input.to);
  const revenueStatusSql = sql.join(
    input.revenueStatuses.map((status) => sql`${status}`),
    sql`, `,
  );
  const rows = await getDb()
    .select({
      date: sql<string>`to_char(${orders.placedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
      orderCount: count(),
      revenueAmount: sql<number>`coalesce(sum(case when ${orders.status} in (${revenueStatusSql}) then ${orders.totalAmount} else 0 end), 0)`.mapWith(
        Number,
      ),
    })
    .from(orders)
    .where(
      and(
        eq(orders.isArchived, false),
        gte(orders.placedAt, bounds.start),
        lte(orders.placedAt, bounds.end),
      ),
    )
    .groupBy(sql`to_char(${orders.placedAt} at time zone 'UTC', 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${orders.placedAt} at time zone 'UTC', 'YYYY-MM-DD')`);

  return rows.map((row) => ({
    date: row.date,
    orderCount: row.orderCount,
    revenueAmount: row.revenueAmount,
    averageOrderValue: averageOrderValue(row.revenueAmount, row.orderCount),
  }));
}

async function computeAnalyticsSummary(input: {
  from: string;
  to: string;
  locale: Locale;
}): Promise<AnalyticsSummary> {
  const revenue = await getStoreRevenue();
  const revenueStatuses = revenue.statuses as OrderStatus[];
  const bounds = periodBounds(input.from, input.to);

  const [current, previous, dailyRows, [usersRow], topProducts, topCategories] =
    await Promise.all([
      queryPeriodMetrics({
        start: bounds.start,
        end: bounds.end,
        revenueStatuses,
      }),
      queryPeriodMetrics({
        start: bounds.previousStart,
        end: bounds.previousEnd,
        revenueStatuses,
      }),
      queryDailyRows({
        from: input.from,
        to: input.to,
        revenueStatuses,
      }),
      getDb().select({ value: count() }).from(users),
      queryTopSellingProducts({
        start: bounds.start,
        end: bounds.end,
        revenueStatuses,
      }),
      queryTopCategories({
        start: bounds.start,
        end: bounds.end,
        revenueStatuses,
        locale: input.locale,
      }),
    ]);

  return {
    from: input.from,
    to: input.to,
    previousFrom: bounds.previousFrom,
    previousTo: bounds.previousTo,
    orderCount: current.orderCount,
    revenueAmount: current.revenueAmount,
    averageOrderValue: averageOrderValue(
      current.revenueAmount,
      current.orderCount,
    ),
    userCount: usersRow?.value ?? 0,
    previousOrderCount: previous.orderCount,
    previousRevenueAmount: previous.revenueAmount,
    previousAverageOrderValue: averageOrderValue(
      previous.revenueAmount,
      previous.orderCount,
    ),
    dailyRows,
    topProducts,
    topCategories,
  };
}

/** Loads analytics summary with Redis cache (300s TTL). */
export async function getAnalyticsSummary(input: {
  from: string;
  to: string;
  locale?: Locale;
}): Promise<AnalyticsSummary> {
  const locale = input.locale ?? "hy";
  const key = cacheKey(input.from, input.to, locale);
  const redis = getProviders().redis.getClient();
  const cached = await redis.get(key);

  if (cached) {
    return JSON.parse(cached) as AnalyticsSummary;
  }

  const summary = await computeAnalyticsSummary({
    from: input.from,
    to: input.to,
    locale,
  });
  await redis.set(key, JSON.stringify(summary), { ex: CACHE_TTL_SECONDS });
  cacheKeys.add(key);
  return summary;
}

/** Deletes cached analytics keys (exact keys tracked in-process). */
export async function invalidateAnalyticsCache(): Promise<void> {
  const redis = getProviders().redis.getClient();
  await Promise.all(
    [...cacheKeys].map(async (key) => {
      await redis.del(key);
      cacheKeys.delete(key);
    }),
  );
}
