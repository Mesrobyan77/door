import "server-only";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db/client";
import { products, wishlistItems } from "@/db/schema";
import {
  getActiveProductsByIds,
  type CatalogProduct,
} from "@/features/products/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { createId } from "@/lib/id";
import type { Locale } from "@/lib/i18n/config";

/** Returns wishlist item count for the signed-in user (0 for guests). */
export async function getWishlistCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) {
    return 0;
  }

  const [row] = await getDb()
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, user.id));

  return row?.count ?? 0;
}

/** Product IDs currently on the viewer's wishlist. */
export async function getWishlistProductIds(
  productIds?: string[],
): Promise<Set<string>> {
  const user = await getCurrentUser();
  if (!user) {
    return new Set();
  }

  const conditions = [eq(wishlistItems.userId, user.id)];
  if (productIds && productIds.length > 0) {
    conditions.push(inArray(wishlistItems.productId, productIds));
  }

  const rows = await getDb()
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .where(and(...conditions));

  return new Set(rows.map((row) => row.productId));
}

/** Whether a product is on the viewer's wishlist. */
export async function isProductInWishlist(productId: string): Promise<boolean> {
  const ids = await getWishlistProductIds([productId]);
  return ids.has(productId);
}

/** Active catalog products on the viewer's wishlist (ordered by wishlist add time). */
export async function listWishlistProducts(
  locale: Locale,
): Promise<CatalogProduct[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const links = await getDb()
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, user.id))
    .orderBy(desc(wishlistItems.createdAt));

  if (links.length === 0) {
    return [];
  }

  const wishedIds = links.map((row) => row.productId);
  const active = await getActiveProductsByIds(locale, wishedIds);
  const byId = new Map(active.map((product) => [product.id, product]));

  return wishedIds
    .map((id) => byId.get(id))
    .filter((product): product is CatalogProduct => product != null);
}

/**
 * Adds or removes a product from the signed-in user's wishlist.
 * Guests must sign in first (caller redirects).
 */
export async function toggleWishlist(productId: string): Promise<{
  inWishlist: boolean;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  const [product] = await getDb()
    .select({
      id: products.id,
      status: products.status,
      deletedAt: products.deletedAt,
    })
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .limit(1);

  if (!product || product.status !== "ACTIVE") {
    throw new Error("PRODUCT_UNAVAILABLE");
  }

  const [existing] = await getDb()
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, user.id),
        eq(wishlistItems.productId, productId),
      ),
    )
    .limit(1);

  if (existing) {
    await getDb()
      .delete(wishlistItems)
      .where(eq(wishlistItems.id, existing.id));
    revalidateWishlistPaths();
    return { inWishlist: false };
  }

  await getDb().insert(wishlistItems).values({
    id: createId(),
    userId: user.id,
    productId,
  });
  revalidateWishlistPaths();
  return { inWishlist: true };
}

function revalidateWishlistPaths(): void {
  revalidatePath("/", "layout");
}
