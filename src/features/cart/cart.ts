'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getDb } from '@/db/client';
import { withTransaction } from '@/db/transaction';
import { cartItems, carts, productVariants, products } from '@/db/schema';
import { getGuestCartToken, hashGuestToken, peekGuestCartToken } from '@/features/cart/guest-token';
import { getCurrentUser } from '@/lib/auth/session';
import { createId } from '@/lib/id';
import { isVariantPurchasable } from '@/features/products/domain/door-variant';

type CartRow = typeof carts.$inferSelect;
type CartItemWithProduct = {
  item: typeof cartItems.$inferSelect;
  product: typeof products.$inferSelect;
  variant: typeof productVariants.$inferSelect;
};

async function getCartOwnerForWrite(): Promise<{
  userId?: string;
  guestTokenHash?: string;
}> {
  const user = await getCurrentUser();
  if (user) return { userId: user.id };
  return { guestTokenHash: hashGuestToken(await getGuestCartToken()) };
}

/** Owner for read paths — never creates a guest cookie or cart row. */
async function getCartOwnerForRead(): Promise<{
  userId?: string;
  guestTokenHash?: string;
} | null> {
  const user = await getCurrentUser();
  if (user) return { userId: user.id };

  const token = await peekGuestCartToken();
  if (!token) return null;

  return { guestTokenHash: hashGuestToken(token) };
}

async function findActiveCart(owner: {
  userId?: string;
  guestTokenHash?: string;
}): Promise<CartRow | null> {
  const ownerCondition = owner.userId
    ? eq(carts.userId, owner.userId)
    : eq(carts.guestTokenHash, owner.guestTokenHash!);

  const [existing] = await getDb()
    .select()
    .from(carts)
    .where(and(eq(carts.status, 'ACTIVE'), ownerCondition))
    .limit(1);

  return existing ?? null;
}

/** Returns the caller's active durable cart, creating it when absent. */
export async function getOrCreateCart(): Promise<CartRow> {
  const owner = await getCartOwnerForWrite();
  const existing = await findActiveCart(owner);
  if (existing) return existing;

  const [created] = await getDb()
    .insert(carts)
    .values({ id: createId(), ...owner })
    .returning();
  if (!created) throw new Error('Unable to create cart.');
  return created;
}

/** Loads cart lines without creating a cart or guest cookie.
 * Used by header, cart page, and checkout reads.
 */
export async function getCartWithItems(): Promise<{
  cart: CartRow | null;
  items: CartItemWithProduct[];
}> {
  const owner = await getCartOwnerForRead();
  if (!owner) {
    return { cart: null, items: [] };
  }

  const cart = await findActiveCart(owner);
  if (!cart) {
    return { cart: null, items: [] };
  }

  const items = await getDb()
    .select({ item: cartItems, product: products, variant: productVariants })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(eq(cartItems.cartId, cart.id));

  return { cart, items };
}

/** Cheap badge count for the header — no cart creation, no line enrichment. */
export async function getCartItemCount(): Promise<number> {
  const owner = await getCartOwnerForRead();
  if (!owner) {
    return 0;
  }

  const cart = await findActiveCart(owner);
  if (!cart) {
    return 0;
  }

  const [row] = await getDb()
    .select({
      total: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int`,
    })
    .from(cartItems)
    .where(eq(cartItems.cartId, cart.id));

  return row?.total ?? 0;
}

export async function addToCart(variantId: string, quantity = 1): Promise<void> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Invalid quantity.');
  }

  const cart = await getOrCreateCart();
  await withTransaction(async (tx) => {
    const [selection] = await tx
      .select({ product: products, variant: productVariants })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(productVariants.id, variantId))
      .for('update')
      .limit(1);
    if (
      !selection ||
      selection.product.status !== 'ACTIVE' ||
      !isVariantPurchasable({
        product: selection.product,
        variant: selection.variant,
      })
    ) {
      throw new Error('Product unavailable.');
    }

    const [existing] = await tx
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, selection.variant.id)))
      .for('update')
      .limit(1);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > selection.variant.stockOnHand) {
      throw new Error('Requested quantity is unavailable.');
    }

    if (existing) {
      await tx
        .update(cartItems)
        .set({ quantity: nextQuantity, updatedAt: new Date() })
        .where(eq(cartItems.id, existing.id));
    } else {
      await tx.insert(cartItems).values({
        id: createId(),
        cartId: cart.id,
        productId: selection.product.id,
        variantId: selection.variant.id,
        quantity,
      });
    }
  });
  await revalidateCartPaths();
}

export async function updateQuantity(itemId: string, quantity: number): Promise<void> {
  const cart = await getOrCreateCart();
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Invalid quantity.');
  }
  await withTransaction(async (tx) => {
    const [line] = await tx
      .select({
        item: cartItems,
        product: products,
        variant: productVariants,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .for('update')
      .limit(1);
    if (
      !line ||
      line.variant.stockOnHand < quantity ||
      !isVariantPurchasable({ product: line.product, variant: line.variant })
    ) {
      throw new Error('Requested quantity is unavailable.');
    }
    await tx
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, line.item.id));
  });
  await revalidateCartPaths();
}

export async function removeItem(itemId: string): Promise<void> {
  const cart = await getOrCreateCart();
  await getDb()
    .delete(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
  await revalidateCartPaths();
}

/** Invalidates storefront cart views after durable cart mutations. */
export async function revalidateCartPaths(): Promise<void> {
  revalidatePath('/[locale]/cart', 'page');
  revalidatePath('/[locale]/checkout', 'page');
  // Header cart badge lives in the locale storefront layout Suspense island.
  revalidatePath('/[locale]', 'layout');
}
