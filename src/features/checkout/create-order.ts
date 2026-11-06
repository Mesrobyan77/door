"use server";

import { createHash } from "node:crypto";

import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";

import { getProviders } from "@/config/providers";
import {
  cartItems,
  carts,
  deliveryRules,
  mediaAssets,
  orderEvents,
  orderItems,
  orders,
  payments,
  productVariants,
  products,
  promotions,
  stockMovements,
} from "@/db/schema";
import type { OrderVariantSnapshot } from "@/db/schema/orders";
import { withTransaction } from "@/db/transaction";
import {
  getCartWithItems,
  revalidateCartPaths,
} from "@/features/cart/cart";
import {
  checkoutSchema,
  type CheckoutInput,
} from "@/features/checkout/schemas";
import { toPaymentRecord } from "@/features/checkout/domain/payment-methods";
import {
  ORDER_NUMBER_LOCK_KEY,
  formatOrderNumber,
  nextOrderSequence,
} from "@/features/orders/domain/order-number";
import {
  couponDiscountErrorMessage,
  evaluateCouponDiscount,
} from "@/features/promotions/domain/evaluate-coupon";
import { normalizePromotionCode } from "@/features/promotions/domain/promotion-rules";
import { resolveVariantPrices } from "@/features/promotions/application/resolve-product-prices";
import { isVariantPurchasable } from "@/features/products/domain/door-variant";
import { getCurrentUser } from "@/lib/auth/session";
import { getCheckoutRateSnapshot } from "@/lib/fx/service";
import { createId } from "@/lib/id";
import { convertAmount } from "@/lib/money/convert";
import { defaultCurrency } from "@/lib/money/currency";
import {
  CURRENCY_COOKIE_NAME,
  parseCurrencyCookie,
} from "@/lib/money/currency-cookie";

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function deliveryLabel(countryCode: string, city: string | null): string {
  const cityPart = city?.trim();
  if (cityPart) {
    return `${cityPart}, ${countryCode}`;
  }
  return countryCode;
}

export type CreateOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string };

/** Creates a COD order with server-side totals, stock decrement, and cart clear. */
export async function createOrderAction(
  raw: CheckoutInput,
): Promise<CreateOrderResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid checkout data." };
  }

  const input = parsed.data;
  const user = await getCurrentUser();
  const { cart, items } = await getCartWithItems();
  const cookieStore = await cookies();
  const displayCurrency = parseCurrencyCookie(
    cookieStore.get(CURRENCY_COOKIE_NAME)?.value,
  );

  if (items.length === 0 || !cart) {
    return { ok: false, error: "Cart is empty." };
  }

  let rateSnapshot;
  try {
    rateSnapshot = await getCheckoutRateSnapshot(displayCurrency);
  } catch {
    return { ok: false, error: "Exchange rate unavailable. Try again shortly." };
  }

  const contactName = `${input.firstName} ${input.lastName}`.trim();
  const scopeHash = hashValue(user?.id ?? cart.guestTokenHash ?? cart.id);
  const keyHash = hashValue(input.idempotencyKey);
  const fingerprint = hashValue(
    JSON.stringify({
      cartId: cart.id,
      items: items.map(({ item }) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      email: input.contactEmail.toLowerCase(),
      shippingMethod: input.shippingMethod,
      paymentMethod: input.paymentMethod,
      deliveryRuleId: input.deliveryRuleId ?? null,
    }),
  );

  try {
    const orderNumber = await withTransaction(async (tx) => {
      const [existing] = await tx
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .where(
          and(
            eq(orders.idempotencyScopeHash, scopeHash),
            eq(orders.idempotencyKeyHash, keyHash),
            eq(orders.requestFingerprint, fingerprint),
          ),
        )
        .limit(1);

      if (existing) {
        return existing.orderNumber;
      }

      let delivery: typeof deliveryRules.$inferSelect | null = null;
      if (input.shippingMethod === "delivery") {
        if (!input.deliveryRuleId) {
          throw new Error("Delivery location is required.");
        }

        const [matched] = await tx
          .select()
          .from(deliveryRules)
          .where(
            and(
              eq(deliveryRules.id, input.deliveryRuleId),
              eq(deliveryRules.isActive, true),
            ),
          )
          .limit(1);

        if (!matched) {
          throw new Error("Selected delivery location is unavailable.");
        }

        delivery = matched;
      }

      const address = {
        recipientFirstName: input.firstName,
        recipientLastName: input.lastName,
        phone: input.contactPhone,
        countryCode: delivery?.countryCode ?? "AM",
        region: input.region,
        city:
          input.shippingMethod === "pickup"
            ? (input.city?.trim() || "Yerevan")
            : (delivery?.city?.trim() || input.city?.trim() || ""),
        line1:
          input.shippingMethod === "pickup"
            ? (input.line1?.trim() || "Store pickup")
            : (input.line1 ?? ""),
        line2: input.line2,
        postalCode: input.postalCode,
      };

      let subtotal = 0;
      const lineSnapshots: Array<{
        productId: string;
        variantId: string;
        title: string;
        sku: string;
        imageUrl: string | null;
        variantSnapshot: OrderVariantSnapshot;
        quantity: number;
        unitAmount: number;
        unitDisplayAmount: number;
        compareAtAmount: number | null;
        lineDiscountAmount: number;
        lineTotal: number;
        nextStock: number;
      }> = [];

      const lockedVariants: Array<{
        product: typeof products.$inferSelect;
        variant: typeof productVariants.$inferSelect;
        quantity: number;
      }> = [];

      for (const { item } of items) {
        const [locked] = await tx
          .select({ product: products, variant: productVariants })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(eq(productVariants.id, item.variantId))
          .for("update")
          .limit(1);

        if (
          !locked ||
          locked.product.status !== "ACTIVE" ||
          !isVariantPurchasable({
            product: locked.product,
            variant: locked.variant,
          })
        ) {
          throw new Error("A selected product configuration is unavailable.");
        }

        if (locked.variant.stockOnHand < item.quantity) {
          throw new Error("Insufficient stock for one or more items.");
        }

        lockedVariants.push({
          product: locked.product,
          variant: locked.variant,
          quantity: item.quantity,
        });
      }

      const pricedUnits = await resolveVariantPrices(
        lockedVariants.map(({ product, variant }) => ({
          id: variant.id,
          productId: product.id,
          priceAmount: variant.priceAmount!,
          compareAtAmount: variant.compareAtAmount,
        })),
      );

      const imageRows = await tx
        .select({
          productId: mediaAssets.productId,
          variantId: mediaAssets.variantId,
          secureUrl: mediaAssets.secureUrl,
        })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.uploadStatus, "READY"),
            or(
              inArray(
                mediaAssets.productId,
                lockedVariants.map(({ product }) => product.id),
              ),
              inArray(
                mediaAssets.variantId,
                lockedVariants.map(({ variant }) => variant.id),
              ),
            ),
            or(eq(mediaAssets.isPrimary, true), eq(mediaAssets.role, "PRIMARY")),
          ),
        )
        .orderBy(asc(mediaAssets.sortOrder));
      const productImages = new Map<string, string>();
      const variantImages = new Map<string, string>();
      for (const image of imageRows) {
        if (!image.secureUrl) continue;
        if (image.variantId && !variantImages.has(image.variantId)) {
          variantImages.set(image.variantId, image.secureUrl);
        }
        if (image.productId && !productImages.has(image.productId)) {
          productImages.set(image.productId, image.secureUrl);
        }
      }

      for (const { product, variant, quantity } of lockedVariants) {
        const resolved = pricedUnits.get(variant.id);
        const unitAmount = resolved?.unitAmount ?? variant.priceAmount!;
        const compareAtAmount = resolved?.compareAtAmount ?? null;
        const lineDiscountAmount = Math.max(
          0,
          (resolved?.listAmount ?? variant.priceAmount!) - unitAmount,
        );
        const lineTotal = unitAmount * quantity;
        const unitDisplayAmount = Number(
          convertAmount(
            unitAmount,
            rateSnapshot.rate,
            defaultCurrency,
            displayCurrency,
          ).amount,
        );
        subtotal += lineTotal;
        lineSnapshots.push({
          productId: product.id,
          variantId: variant.id,
          title:
            product.translations[input.locale]?.title ??
            product.translations.hy?.title ??
            product.modelName ??
            product.sku,
          sku: variant.sku,
          imageUrl:
            variantImages.get(variant.id) ??
            productImages.get(product.id) ??
            null,
          variantSnapshot: {
            product: {
              brandName: product.brandName,
              modelName: product.modelName,
              collectionName: product.collectionName,
              classification: product.doorClassification,
              entranceEnvironments: product.entranceEnvironments,
              structuralMaterial: product.structuralMaterial,
              coreMaterial: product.coreMaterial,
              surfaceCoating: product.surfaceCoating,
              hasGlazing: product.hasGlazing,
              glazingType: product.glazingType,
              manufacturer: product.manufacturer,
              countryOfManufacture: product.countryOfManufacture,
              openingMechanism: product.openingMechanism,
              frameSystem: product.frameSystem,
              leafConfiguration: product.leafConfiguration,
              performanceSpecifications: product.performanceSpecifications,
            },
            itemType: variant.itemType,
            dimensionsMm: {
              ...(variant.leafWidthMm != null
                ? { leafWidth: variant.leafWidthMm }
                : {}),
              ...(variant.leafHeightMm != null
                ? { leafHeight: variant.leafHeightMm }
                : {}),
              ...(variant.leafThicknessMm != null
                ? { leafThickness: variant.leafThicknessMm }
                : {}),
              ...(variant.secondaryLeafWidthMm != null
                ? { secondaryLeafWidth: variant.secondaryLeafWidthMm }
                : {}),
              ...(variant.unitWidthMm != null
                ? { unitWidth: variant.unitWidthMm }
                : {}),
              ...(variant.unitHeightMm != null
                ? { unitHeight: variant.unitHeightMm }
                : {}),
              ...(variant.frameDepthMm != null
                ? { frameDepth: variant.frameDepthMm }
                : {}),
              ...(variant.roughOpeningWidthMm != null
                ? { roughOpeningWidth: variant.roughOpeningWidthMm }
                : {}),
              ...(variant.roughOpeningHeightMm != null
                ? { roughOpeningHeight: variant.roughOpeningHeightMm }
                : {}),
            },
            appearance: {
              ...(variant.colorName ? { color: variant.colorName } : {}),
              ...(variant.finishName ? { finish: variant.finishName } : {}),
              ...(variant.exteriorColorName
                ? { exteriorColor: variant.exteriorColorName }
                : {}),
              ...(variant.exteriorFinishName
                ? { exteriorFinish: variant.exteriorFinishName }
                : {}),
            },
            handing: variant.handing,
            swing: variant.swing,
            includedComponents: variant.includedComponents,
          },
          quantity,
          unitAmount,
          unitDisplayAmount,
          compareAtAmount,
          lineDiscountAmount,
          lineTotal,
          nextStock: variant.stockOnHand - quantity,
        });
      }

      const deliveryAmount =
        input.shippingMethod === "pickup"
          ? 0
          : delivery &&
              (delivery.freeThresholdAmount === null ||
                subtotal < delivery.freeThresholdAmount)
            ? delivery.priceAmount
            : 0;

      let discountAmount = 0;
      let appliedPromotion: typeof promotions.$inferSelect | null = null;
      if (input.couponCode) {
        const code = normalizePromotionCode(input.couponCode);
        const [coupon] = await tx
          .select()
          .from(promotions)
          .where(
            and(eq(promotions.kind, "COUPON"), eq(promotions.code, code)),
          )
          .for("update")
          .limit(1);

        const nowCheck = new Date();
        const evaluated = evaluateCouponDiscount(coupon, subtotal, nowCheck);
        if (!evaluated.ok || !coupon) {
          throw new Error(
            couponDiscountErrorMessage(
              evaluated.ok ? "INVALID_OR_INACTIVE" : evaluated.error,
            ),
          );
        }

        discountAmount = evaluated.discountAmount;
        appliedPromotion = coupon;

        await tx
          .update(promotions)
          .set({
            usedCount: sql`${promotions.usedCount} + 1`,
            updatedAt: nowCheck,
          })
          .where(eq(promotions.id, coupon.id));
      }

      const totalAmount = Math.max(0, subtotal - discountAmount) + deliveryAmount;
      const orderId = createId();
      await tx.execute(
        sql`select pg_advisory_xact_lock(${ORDER_NUMBER_LOCK_KEY})`,
      );
      const [maxRow] = await tx
        .select({
          maxSeq: sql<number | null>`max(cast(substring(${orders.orderNumber} from 2) as integer))`,
        })
        .from(orders)
        .where(sql`${orders.orderNumber} ~ '^p[0-9]+$'`);
      const number = formatOrderNumber(nextOrderSequence(maxRow?.maxSeq ?? null));
      const now = new Date();

      await tx.insert(orders).values({
        id: orderId,
        orderNumber: number,
        userId: user?.id,
        contactEmail: input.contactEmail.toLowerCase(),
        contactPhone: input.contactPhone,
        contactName,
        status: "PENDING",
        paymentStatus: "PENDING",
        baseCurrency: defaultCurrency,
        displayCurrency,
        exchangeRate: rateSnapshot.rate,
        exchangeRateSource: rateSnapshot.source,
        exchangeRateAsOf: rateSnapshot.asOf,
        subtotalAmount: subtotal,
        discountAmount,
        taxAmount: 0,
        deliveryAmount,
        totalAmount,
        shippingAddress: address,
        billingAddress: address,
        promotionId: appliedPromotion?.id,
        promotionCodeSnapshot: appliedPromotion?.code ?? null,
        promotionTypeSnapshot: appliedPromotion?.discountType ?? null,
        promotionValueSnapshot: appliedPromotion?.discountValue ?? null,
        promotionDiscountAmount: appliedPromotion ? discountAmount : null,
        deliveryRuleId:
          input.shippingMethod === "delivery" ? (delivery?.id ?? null) : null,
        deliveryLabelSnapshot:
          input.shippingMethod === "pickup"
            ? "Store pickup"
            : delivery
              ? deliveryLabel(delivery.countryCode, delivery.city)
              : "Delivery",
        deliveryEstimateSnapshot:
          input.shippingMethod === "pickup"
            ? null
            : delivery
              ? `${delivery.estimatedDaysMin ?? 1}-${delivery.estimatedDaysMax ?? 3} days`
              : null,
        idempotencyScopeHash: scopeHash,
        idempotencyKeyHash: keyHash,
        requestFingerprint: fingerprint,
        locale: input.locale,
        placedAt: now,
      });

      for (const line of lineSnapshots) {
        await tx.insert(orderItems).values({
          id: createId(),
          orderId,
          productId: line.productId,
          variantId: line.variantId,
          productTitleSnapshot: line.title,
          productSkuSnapshot: line.sku,
          productImageKeySnapshot: line.imageUrl,
          variantSnapshot: line.variantSnapshot,
          quantity: line.quantity,
          unitBaseAmount: line.unitAmount,
          unitDisplayAmount: line.unitDisplayAmount,
          compareAtAmount: line.compareAtAmount,
          discountAmount: line.lineDiscountAmount * line.quantity,
          lineTotalAmount: line.lineTotal,
          currency: defaultCurrency,
        });

        await tx
          .update(productVariants)
          .set({
            stockOnHand: line.nextStock,
            updatedAt: now,
          })
          .where(eq(productVariants.id, line.variantId));

        await tx.insert(stockMovements).values({
          id: createId(),
          productId: line.productId,
          variantId: line.variantId,
          delta: -line.quantity,
          reason: "ORDER",
          orderId,
          resultingBalance: line.nextStock,
          correlationId: number,
        });
      }

      const payment = await getProviders().payment.createPayment({
        orderId,
        amount: BigInt(totalAmount),
        currency: defaultCurrency,
        idempotencyKey: input.idempotencyKey,
      });
      const paymentRecord = toPaymentRecord(input.paymentMethod);

      await tx.insert(payments).values({
        id: createId(),
        orderId,
        provider: paymentRecord.provider,
        method: paymentRecord.method,
        providerReference: payment.providerReference,
        amount: totalAmount,
        currency: defaultCurrency,
        status: "PENDING",
        attemptNumber: 1,
      });

      await tx.insert(orderEvents).values({
        id: createId(),
        orderId,
        eventType: "STATUS_CHANGE",
        fromState: null,
        toState: "PENDING",
        actorUserId: user?.id,
        isCustomerVisible: true,
        payload: { source: "checkout" },
      });

      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
      await tx
        .update(carts)
        .set({ status: "CONVERTED", updatedAt: now })
        .where(eq(carts.id, cart.id));

      return number;
    });

    await revalidateCartPaths();
    return { ok: true, orderNumber };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to place order.";
    return { ok: false, error: message };
  }
}
