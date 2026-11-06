"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { orderItems, orders, products, reviews } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  isReviewEligibleOrderStatus,
  sanitizeReviewComment,
} from "@/features/reviews/domain/review-rules";
import {
  submitReviewSchema,
  type SubmitReviewInput,
} from "@/features/reviews/schemas/reviews";
import { requireUser } from "@/lib/auth/policies";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

/** Customer submits a product review (pending moderation). */
export async function submitReviewAction(
  locale: string,
  raw: SubmitReviewInput,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = submitReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid review payload.");
  }

  const user = await requireUser(locale as Locale);
  const comment = sanitizeReviewComment(parsed.data.comment);

  try {
    const result = await withTransaction(async (tx) => {
      const [product] = await tx
        .select({
          id: products.id,
          status: products.status,
          translations: products.translations,
        })
        .from(products)
        .where(eq(products.id, parsed.data.productId))
        .limit(1);

      if (!product || product.status !== "ACTIVE") {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const [existing] = await tx
        .select({ id: reviews.id })
        .from(reviews)
        .where(
          and(
            eq(reviews.userId, user.id),
            eq(reviews.productId, parsed.data.productId),
          ),
        )
        .limit(1);

      if (existing) {
        throw new Error("ALREADY_REVIEWED");
      }

      const eligibilityRows = await tx
        .select({
          orderItemId: orderItems.id,
          orderStatus: orders.status,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orderItems.productId, parsed.data.productId),
            eq(orders.userId, user.id),
            eq(orders.isArchived, false),
          ),
        )
        .orderBy(desc(orders.placedAt));

      const eligible = eligibilityRows.find((row) =>
        isReviewEligibleOrderStatus(row.orderStatus),
      );

      const id = createId();
      await tx.insert(reviews).values({
        id,
        userId: user.id,
        productId: parsed.data.productId,
        orderItemId: eligible?.orderItemId ?? null,
        rating: parsed.data.rating,
        comment: comment.length > 0 ? comment : null,
        moderationStatus: "PENDING",
      });

      const slug =
        product.translations[locale as Locale]?.slug ??
        product.translations.hy?.slug ??
        null;

      return { id, slug };
    });

    revalidatePath(`/${locale}/products`);
    if (result.slug) {
      revalidatePath(`/${locale}/products/${result.slug}`);
    }
    return ok({ id: result.id });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    switch (code) {
      case "PRODUCT_NOT_FOUND":
        return err("PRODUCT_NOT_FOUND", "Product not found.");
      case "ALREADY_REVIEWED":
        return err("ALREADY_REVIEWED", "You already reviewed this product.");
      default:
        return err("REVIEW_SUBMIT_FAILED", "Unable to submit review.");
    }
  }
}
