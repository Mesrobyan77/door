"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db/client";
import {
  productVariants,
  products,
  stockMovements,
  type TranslationsJson,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth/policies";
import { createId } from "@/lib/id";
import { isLocale } from "@/lib/i18n/config";

const productSchema = z.object({ sku: z.string().trim().min(1), priceAmount: z.coerce.number().int().nonnegative(), stockOnHand: z.coerce.number().int().nonnegative(), status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]), title: z.string().trim().min(1), slug: z.string().trim().min(1), description: z.string().trim().optional() });

function translations(data: z.infer<typeof productSchema>): TranslationsJson {
  const hy = { title: data.title, slug: data.slug, description: data.description };
  return { hy, en: hy, ru: hy };
}

export async function createProductAction(locale: string, formData: FormData): Promise<void> {
  if (!isLocale(locale)) throw new Error("Invalid locale.");
  const actor = await requireAdmin(locale);
  const data = productSchema.parse(Object.fromEntries(formData));
  const id = createId();
  await getDb().transaction(async (tx) => {
    await tx.insert(products).values({ id, sku: data.sku, priceAmount: data.priceAmount, stockOnHand: data.stockOnHand, status: data.status, translations: translations(data) });
    await tx.insert(productVariants).values({
      id,
      productId: id,
      sku: data.sku,
      configurationKey: "LEGACY",
      itemType: "LEGACY",
      priceAmount: data.priceAmount,
      stockOnHand: data.stockOnHand,
    });
    if (data.stockOnHand) {
      await tx.insert(stockMovements).values({ id: createId(), productId: id, variantId: id, delta: data.stockOnHand, reason: "ADMIN_ADJUSTMENT", actorUserId: actor.id, resultingBalance: data.stockOnHand });
    }
  });
  revalidatePath(`/${locale}/products`);
}

export async function adjustStockAction(locale: string, variantId: string, formData: FormData): Promise<void> {
  if (!isLocale(locale)) throw new Error("Invalid locale.");
  const actor = await requireAdmin(locale);
  const delta = z.coerce.number().int().parse(formData.get("delta"));
  await getDb().transaction(async (tx) => {
    const [variant] = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .for("update")
      .limit(1);
    if (!variant || variant.stockOnHand + delta < 0) {
      throw new Error("Invalid stock adjustment.");
    }
    const balance = variant.stockOnHand + delta;
    await tx.update(productVariants).set({ stockOnHand: balance, updatedAt: new Date() }).where(eq(productVariants.id, variantId));
    await tx.insert(stockMovements).values({ id: createId(), productId: variant.productId, variantId, delta, reason: "ADMIN_ADJUSTMENT", actorUserId: actor.id, resultingBalance: balance });
  });
}
