"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db/client";
import { products, stockMovements, type TranslationsJson } from "@/db/schema";
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
  await getDb().insert(products).values({ id, sku: data.sku, priceAmount: data.priceAmount, stockOnHand: data.stockOnHand, status: data.status, translations: translations(data) });
  if (data.stockOnHand) await getDb().insert(stockMovements).values({ id: createId(), productId: id, delta: data.stockOnHand, reason: "ADMIN_ADJUSTMENT", actorUserId: actor.id, resultingBalance: data.stockOnHand });
  revalidatePath(`/${locale}/products`);
}

export async function adjustStockAction(locale: string, productId: string, formData: FormData): Promise<void> {
  if (!isLocale(locale)) throw new Error("Invalid locale.");
  const actor = await requireAdmin(locale);
  const delta = z.coerce.number().int().parse(formData.get("delta"));
  const [product] = await getDb().select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product || product.stockOnHand + delta < 0) throw new Error("Invalid stock adjustment.");
  const balance = product.stockOnHand + delta;
  await getDb().update(products).set({ stockOnHand: balance, updatedAt: new Date() }).where(eq(products.id, productId));
  await getDb().insert(stockMovements).values({ id: createId(), productId, delta, reason: "ADMIN_ADJUSTMENT", actorUserId: actor.id, resultingBalance: balance });
}
