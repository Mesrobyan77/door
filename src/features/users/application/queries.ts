import "server-only";

import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";

import { getDb } from "@/db/client";
import { orders, users } from "@/db/schema";
import type { AdminUsersFilter } from "@/features/users/schemas/admin-users";

const PAGE_SIZE = 20;

export type AdminUserListItem = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  orderCount: number;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export type AdminUserDetail = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    status: string;
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
    anonymizedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    baseCurrency: string;
    placedAt: Date;
  }>;
};

/** Lists users for the admin surface with optional search/role/status filters. */
export async function listAdminUsers(
  filters: AdminUsersFilter,
): Promise<{ rows: AdminUserListItem[]; total: number; pageSize: number }> {
  const conditions: SQL[] = [];

  if (filters.role) {
    conditions.push(eq(users.role, filters.role));
  }

  if (filters.status) {
    conditions.push(eq(users.status, filters.status));
  }

  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(users.email, pattern),
        ilike(users.firstName, pattern),
        ilike(users.lastName, pattern),
        ilike(users.phone, pattern),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (filters.page - 1) * PAGE_SIZE;

  const [rows, [totalRow]] = await Promise.all([
    getDb()
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    getDb().select({ value: count() }).from(users).where(where),
  ]);

  const orderCountMap = new Map<string, number>();
  if (rows.length > 0) {
    const counts = await getDb()
      .select({
        userId: orders.userId,
        value: count(),
      })
      .from(orders)
      .where(
        inArray(
          orders.userId,
          rows.map((row) => row.id),
        ),
      )
      .groupBy(orders.userId);

    for (const row of counts) {
      if (row.userId) {
        orderCountMap.set(row.userId, row.value);
      }
    }
  }

  return {
    rows: rows.map((row) => ({
      ...row,
      orderCount: orderCountMap.get(row.id) ?? 0,
    })),
    total: totalRow?.value ?? 0,
    pageSize: PAGE_SIZE,
  };
}

/** Loads a user profile plus their most recent orders for the admin detail page. */
export async function getAdminUserById(
  userId: string,
): Promise<AdminUserDetail | null> {
  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      lastLoginAt: users.lastLoginAt,
      anonymizedAt: users.anonymizedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  const recentOrders = await getDb()
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      totalAmount: orders.totalAmount,
      baseCurrency: orders.baseCurrency,
      placedAt: orders.placedAt,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.placedAt))
    .limit(10);

  return { user, recentOrders };
}
