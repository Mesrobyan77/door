import { createHash } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const requestContext = vi.hoisted(() => ({ token: 'uninitialized' }));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
  })),
}));
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: vi.fn(async () => null) }));
vi.mock('@/features/cart/guest-token', () => ({
  getGuestCartToken: vi.fn(async () => requestContext.token),
  peekGuestCartToken: vi.fn(async () => requestContext.token),
  hashGuestToken: vi.fn((token: string) => `door-verification:${token}`),
}));
vi.mock('@/lib/fx/service', () => ({
  getCheckoutRateSnapshot: vi.fn(async () => ({
    rate: '1',
    source: 'integration-test',
    asOf: new Date('2026-11-06T00:00:00.000Z'),
  })),
}));
vi.mock('@/lib/media/cloudinary', () => ({ deleteCloudinaryImage: vi.fn(async () => undefined) }));

import { getDb } from '@/db/client';
import {
  cartItems,
  carts,
  mediaAssets,
  orderItems,
  orders,
  productVariants,
  products,
  promotions,
  stockMovements,
} from '@/db/schema';
import { addToCart } from '@/features/cart/cart';
import { createOrderAction } from '@/features/checkout/create-order';
import { persistProductVariantMedia } from '@/features/products/application/persist-product-media';
import { createId } from '@/lib/id';

const db = getDb();
const fixtureTag = `VERIFY-DOOR-${Date.now()}`;
const fixtureSlug = fixtureTag.toLowerCase();
const fixture = {
  productId: createId(),
  purchasableVariantId: createId(),
  archivedVariantId: createId(),
  outOfStockVariantId: createId(),
  scarceVariantId: createId(),
  promotionId: createId(),
  mediaAId: createId(),
  mediaBId: createId(),
  fallbackMediaId: createId(),
};

function setGuest(name: string): string {
  requestContext.token = `${fixtureTag}:${name}`;
  return `door-verification:${requestContext.token}`;
}

function runAsGuest<T>(name: string, operation: () => Promise<T>): Promise<T> {
  setGuest(name);
  return operation();
}

async function createCartWithLine(
  variantId: string,
  quantity: number,
  name: string,
): Promise<string> {
  const cartId = createId();
  await db.insert(carts).values({
    id: cartId,
    guestTokenHash: setGuest(name),
    status: 'ACTIVE',
  });
  await db.insert(cartItems).values({
    id: createId(),
    cartId,
    productId: fixture.productId,
    variantId,
    quantity,
  });
  return cartId;
}

function checkoutInput(key: string) {
  const idempotencyKey = `${fixtureTag}:${key}`;
  return {
    firstName: 'Verification',
    lastName: 'Fixture',
    contactEmail: `checkout-${fixtureTag}-${key}@example.test`,
    contactPhone: '+37455000000',
    shippingMethod: 'pickup' as const,
    paymentMethod: 'cash_on_delivery' as const,
    idempotencyKey,
    locale: 'en' as const,
  };
}

async function ordersForKey(key: string) {
  const keyHash = createHash('sha256').update(`${fixtureTag}:${key}`).digest('hex');
  return db.select().from(orders).where(eq(orders.idempotencyKeyHash, keyHash));
}

beforeAll(async () => {
  await db.insert(products).values({
    id: fixture.productId,
    sku: fixtureTag,
    translations: {
      hy: { title: fixtureTag, slug: `${fixtureSlug}-hy` },
      en: { title: fixtureTag, slug: `${fixtureSlug}-en` },
      ru: { title: fixtureTag, slug: `${fixtureSlug}-ru` },
    },
    priceAmount: 150000,
    stockOnHand: 3,
    lowStockThreshold: 0,
    status: 'ACTIVE',
    doorClassification: 'INTERIOR',
  });
  await db.insert(productVariants).values([
    {
      id: fixture.purchasableVariantId,
      productId: fixture.productId,
      sku: `${fixtureTag}-BUY`,
      configurationKey: `${fixtureTag}:buy`,
      itemType: 'FRAMED_UNIT',
      status: 'ACTIVE',
      priceAmount: 150000,
      stockOnHand: 3,
      lowStockThreshold: 0,
      unitWidthMm: 900,
      unitHeightMm: 2100,
    },
    {
      id: fixture.archivedVariantId,
      productId: fixture.productId,
      sku: `${fixtureTag}-ARCHIVED`,
      configurationKey: `${fixtureTag}:archived`,
      itemType: 'FRAMED_UNIT',
      status: 'ARCHIVED',
      priceAmount: 120000,
      stockOnHand: 2,
      lowStockThreshold: 0,
      unitWidthMm: 800,
      unitHeightMm: 2100,
    },
    {
      id: fixture.outOfStockVariantId,
      productId: fixture.productId,
      sku: `${fixtureTag}-OUT`,
      configurationKey: `${fixtureTag}:out`,
      itemType: 'FRAMED_UNIT',
      status: 'ACTIVE',
      priceAmount: 120000,
      stockOnHand: 0,
      lowStockThreshold: 0,
      unitWidthMm: 700,
      unitHeightMm: 2100,
    },
    {
      id: fixture.scarceVariantId,
      productId: fixture.productId,
      sku: `${fixtureTag}-SCARCE`,
      configurationKey: `${fixtureTag}:scarce`,
      itemType: 'FRAMED_UNIT',
      status: 'ACTIVE',
      priceAmount: 80000,
      stockOnHand: 1,
      lowStockThreshold: 0,
      unitWidthMm: 1000,
      unitHeightMm: 2100,
    },
  ]);
  await db.insert(promotions).values({
    id: fixture.promotionId,
    kind: 'AUTOMATIC',
    productVariantId: fixture.purchasableVariantId,
    discountType: 'PERCENTAGE',
    discountValue: 10,
    isActive: true,
  });
  await db.insert(mediaAssets).values([
    {
      id: fixture.mediaAId,
      variantId: fixture.purchasableVariantId,
      secureUrl: 'https://example.test/verify-door-a.webp',
      cloudinaryPublicId: `${fixtureTag}/a`,
      mimeType: 'image/webp',
      byteSize: 1,
      uploadStatus: 'READY',
      purpose: null,
      role: 'PRIMARY',
      isPrimary: true,
      sortOrder: 0,
    },
    {
      id: fixture.mediaBId,
      variantId: fixture.purchasableVariantId,
      secureUrl: 'https://example.test/verify-door-b.webp',
      cloudinaryPublicId: `${fixtureTag}/b`,
      mimeType: 'image/webp',
      byteSize: 1,
      uploadStatus: 'READY',
      purpose: null,
      role: 'GALLERY',
      isPrimary: false,
      sortOrder: 1,
    },
    {
      id: fixture.fallbackMediaId,
      productId: fixture.productId,
      secureUrl: 'https://example.test/verify-door-product-fallback.webp',
      cloudinaryPublicId: `${fixtureTag}/fallback`,
      mimeType: 'image/webp',
      byteSize: 1,
      uploadStatus: 'READY',
      purpose: null,
      role: 'PRIMARY',
      isPrimary: true,
      sortOrder: 0,
    },
  ]);
});

describe('door-store server-side verification', () => {
  it('rejects archived and unavailable variants through the cart action without adding lines', async () => {
    setGuest('cart-unavailable');
    await expect(
      runAsGuest('cart-unavailable', () => addToCart(fixture.archivedVariantId)),
    ).rejects.toThrow('Product unavailable.');
    await expect(
      runAsGuest('cart-unavailable', () => addToCart(fixture.outOfStockVariantId)),
    ).rejects.toThrow('Product unavailable.');

    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.guestTokenHash, `door-verification:${requestContext.token}`));
    const lines = cart
      ? await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id))
      : [];
    expect(lines).toHaveLength(0);
  });

  it('rejects archived and unavailable variants at checkout without creating an order or changing stock', async () => {
    for (const [variantId, label] of [
      [fixture.archivedVariantId, 'checkout-archived'],
      [fixture.outOfStockVariantId, 'checkout-out'],
    ] as const) {
      const cartId = await createCartWithLine(variantId, 1, label);
      const before = await db
        .select({ stock: productVariants.stockOnHand })
        .from(productVariants)
        .where(eq(productVariants.id, variantId));
      const result = await runAsGuest(label, () => createOrderAction(checkoutInput(label)));
      expect(result).toEqual({
        ok: false,
        error: 'A selected product configuration is unavailable.',
      });
      expect(await ordersForKey(label)).toHaveLength(0);
      const after = await db
        .select({ stock: productVariants.stockOnHand })
        .from(productVariants)
        .where(eq(productVariants.id, variantId));
      const remainingCartLines = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, cartId));
      expect(after).toEqual(before);
      expect(remainingCartLines).toHaveLength(1);
    }
  });

  it('uses the variant-targeted discounted price for COD totals, snapshots, and stock', async () => {
    await createCartWithLine(fixture.purchasableVariantId, 2, 'discounted-cod');
    const result = await runAsGuest('discounted-cod', () =>
      createOrderAction(checkoutInput('discounted-cod')),
    );
    expect(result).toEqual(expect.objectContaining({ ok: true }));

    const [order] = await ordersForKey('discounted-cod');
    expect(order).toMatchObject({ subtotalAmount: 270000, discountAmount: 0, totalAmount: 270000 });
    const [line] = await db.select().from(orderItems).where(eq(orderItems.orderId, order!.id));
    expect(line).toMatchObject({
      variantId: fixture.purchasableVariantId,
      productSkuSnapshot: `${fixtureTag}-BUY`,
      quantity: 2,
      unitBaseAmount: 135000,
      discountAmount: 30000,
      lineTotalAmount: 270000,
    });
    const [variant] = await db
      .select({ stock: productVariants.stockOnHand })
      .from(productVariants)
      .where(eq(productVariants.id, fixture.purchasableVariantId));
    expect(variant?.stock).toBe(1);
  });

  it('returns one order and decrements inventory once for concurrent duplicate checkout submissions', async () => {
    await createCartWithLine(fixture.purchasableVariantId, 1, 'duplicate');
    const [before] = await db
      .select({ stock: productVariants.stockOnHand })
      .from(productVariants)
      .where(eq(productVariants.id, fixture.purchasableVariantId));
    const input = checkoutInput('duplicate');
    const results = await Promise.all([
      runAsGuest('duplicate', () => createOrderAction(input)),
      runAsGuest('duplicate', () => createOrderAction(input)),
    ]);
    expect(results).toEqual([
      expect.objectContaining({ ok: true }),
      expect.objectContaining({ ok: true }),
    ]);
    const duplicateOrders = await ordersForKey('duplicate');
    expect(duplicateOrders).toHaveLength(1);
    const [variant] = await db
      .select({ stock: productVariants.stockOnHand })
      .from(productVariants)
      .where(eq(productVariants.id, fixture.purchasableVariantId));
    expect(variant?.stock).toBe((before?.stock ?? 0) - 1);
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.orderId, duplicateOrders[0]!.id));
    expect(movements).toHaveLength(1);
    expect(movements[0]?.delta).toBe(-1);
  });

  it('prevents overselling when concurrent buyers compete for one remaining unit', async () => {
    await createCartWithLine(fixture.scarceVariantId, 1, 'compete');
    setGuest('compete');
    const first = createOrderAction(checkoutInput('compete-a'));
    const second = createOrderAction(checkoutInput('compete-b'));
    const results = await Promise.all([first, second]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    const [variant] = await db
      .select({ stock: productVariants.stockOnHand })
      .from(productVariants)
      .where(eq(productVariants.id, fixture.scarceVariantId));
    expect(variant?.stock).toBe(0);
    const orderCount =
      (await ordersForKey('compete-a')).length + (await ordersForKey('compete-b')).length;
    expect(orderCount).toBe(1);
  });

  it('persists variant-gallery reorder, primary selection, detach, and product-image fallback data', async () => {
    const reorder = await persistProductVariantMedia({
      productId: fixture.productId,
      variantId: fixture.purchasableVariantId,
      mediaAssetIds: [],
      orderedImageIds: [fixture.mediaBId, fixture.mediaAId],
      primaryNewIndex: null,
      primaryExistingId: fixture.mediaBId,
      removeImageIds: [],
    });
    expect(reorder).toEqual({ error: null });

    const reordered = await db
      .select({ id: mediaAssets.id, sort: mediaAssets.sortOrder, primary: mediaAssets.isPrimary })
      .from(mediaAssets)
      .where(eq(mediaAssets.variantId, fixture.purchasableVariantId));
    expect(reordered.sort((a, b) => a.sort - b.sort)).toEqual([
      { id: fixture.mediaBId, sort: 0, primary: true },
      { id: fixture.mediaAId, sort: 1, primary: false },
    ]);

    const detach = await persistProductVariantMedia({
      productId: fixture.productId,
      variantId: fixture.purchasableVariantId,
      mediaAssetIds: [],
      orderedImageIds: [fixture.mediaBId],
      primaryNewIndex: null,
      primaryExistingId: fixture.mediaBId,
      removeImageIds: [fixture.mediaAId],
    });
    expect(detach).toEqual({ error: null });
    const [detached] = await db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, fixture.mediaAId));
    const [fallback] = await db
      .select({ id: mediaAssets.id, productId: mediaAssets.productId })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, fixture.fallbackMediaId));
    expect(detached).toBeUndefined();
    expect(fallback).toEqual({ id: fixture.fallbackMediaId, productId: fixture.productId });
  });
});
