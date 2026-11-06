"use server";

import { toggleWishlist } from "@/features/wishlist/queries";
import { err, ok, type Result } from "@/lib/result";

export async function toggleWishlistAction(
  productId: string,
): Promise<Result<{ inWishlist: boolean }>> {
  try {
    const result = await toggleWishlist(productId);
    return ok(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "UNAUTHENTICATED") {
      return err("UNAUTHENTICATED", "Sign in to use wishlist.");
    }
    if (code === "PRODUCT_UNAVAILABLE") {
      return err("PRODUCT_UNAVAILABLE", "Product unavailable.");
    }
    return err("WISHLIST_FAILED", "Unable to update wishlist.");
  }
}
