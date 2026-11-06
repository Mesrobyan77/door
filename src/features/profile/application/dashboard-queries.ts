import "server-only";

import { count, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { orderItems, orders } from "@/db/schema";

const RECENT_ORDERS_LIMIT = 6;

export type ProfileDashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent: number;
};

export type ProfileRecentOrder = {
  id: string;
  orderNumber: string;
  status: (typeof orders.$inferSelect)["status"];
  totalAmount: number;
  placedAt: Date;
  itemsCount: number;
};

/** Aggregated order stats for the profile dashboard (SQL, not full-row scan). */
export async function getProfileDashboardStats(
  userId: string,
): Promise<ProfileDashboardStats> {
  const [row] = await getDb()
    .select({
      totalOrders: count(),
      pendingOrders: sql<number>`
        count(*) filter (
          where ${orders.status}::text in ('PENDING', 'CONFIRMED', 'PROCESSING')
        )
      `.mapWith(Number),
      completedOrders: sql<number>`
        count(*) filter (where ${orders.status}::text = 'DELIVERED')
      `.mapWith(Number),
      totalSpent: sql<number>`
        coalesce(
          sum(${orders.totalAmount}) filter (
            where ${orders.status}::text not in ('CANCELLED', 'REFUNDED')
          ),
          0
        )
      `.mapWith(Number),
    })
    .from(orders)
    .where(eq(orders.userId, userId));

  return {
    totalOrders: row?.totalOrders ?? 0,
    pendingOrders: row?.pendingOrders ?? 0,
    completedOrders: row?.completedOrders ?? 0,
    totalSpent: row?.totalSpent ?? 0,
  };
}

/** Latest orders for the profile dashboard preview list. */
export async function listRecentProfileOrders(
  userId: string,
  limit: number = RECENT_ORDERS_LIMIT,
): Promise<ProfileRecentOrder[]> {
  return getDb()
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      placedAt: orders.placedAt,
      itemsCount: sql<number>`
        coalesce(
          (
            select sum(${orderItems.quantity})
            from ${orderItems}
            where ${orderItems.orderId} = ${orders.id}
          ),
          0
        )
      `.mapWith(Number),
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.placedAt))
    .limit(limit);
}

/** Parallel dashboard payload — stats + recent rows. */
export async function getProfileDashboard(userId: string): Promise<{
  stats: ProfileDashboardStats;
  recentOrders: ProfileRecentOrder[];
}> {
  const [stats, recentOrders] = await Promise.all([
    getProfileDashboardStats(userId),
    listRecentProfileOrders(userId),
  ]);
  return { stats, recentOrders };
}
