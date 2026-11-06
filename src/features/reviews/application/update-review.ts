"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { products, reviews } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  canEditOwnReview,
  isReviewModerationStatus,
  sanitizeReviewComment,
} from "@/features/reviews/domain/review-rules";
import {
  updateReviewSchema,
  type UpdateReviewInput,
} from "@/features/reviews/schemas/reviews";
import { requireUser } from "@/lib/auth/policies";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

/** Owner updates rating/comment; edited reviews return to pending moderation. */
export async function updateReviewAction(
  locale: string,
  raw: UpdateReviewInput,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = updateReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid review payload.");
  }

  const user = await requireUser(locale as Locale);
  const comment = sanitizeReviewComment(parsed.data.comment);

  try {
    const result = await withTransaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: reviews.id,
          userId: reviews.userId,
          productId: reviews.productId,
          moderationStatus: reviews.moderationStatus,
        })
        .from(reviews)
        .where(
          and(
            eq(reviews.id, parsed.data.reviewId),
            eq(reviews.userId, user.id),
          ),
        )
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      if (
        !isReviewModerationStatus(existing.moderationStatus) ||
        !canEditOwnReview(existing.moderationStatus)
      ) {
        throw new Error("NOT_EDITABLE");
      }

      const [product] = await tx
        .select({
          status: products.status,
          translations: products.translations,
        })
        .from(products)
        .where(eq(products.id, existing.productId))
        .limit(1);

      if (!product || product.status !== "ACTIVE") {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      await tx
        .update(reviews)
        .set({
          rating: parsed.data.rating,
          comment: comment.length > 0 ? comment : null,
          moderationStatus: "PENDING",
          moderatedByUserId: null,
          moderatedAt: null,
          moderationReason: null,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, existing.id));

      const slug =
        product.translations[locale as Locale]?.slug ??
        product.translations.hy?.slug ??
        null;

      return { id: existing.id, slug };
    });

    revalidatePath(`/${locale}/products`);
    if (result.slug) {
      revalidatePath(`/${locale}/products/${result.slug}`);
    }
    return ok({ id: result.id });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    switch (code) {
      case "NOT_FOUND":
        return err("NOT_FOUND", "Review not found.");
      case "NOT_EDITABLE":
        return err("NOT_EDITABLE", "This review cannot be edited.");
      case "PRODUCT_NOT_FOUND":
        return err("PRODUCT_NOT_FOUND", "Product not found.");
      default:
        return err("REVIEW_UPDATE_FAILED", "Unable to update review.");
    }
  }
}
