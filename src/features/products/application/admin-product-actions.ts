"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db/client";
import {
  productVariants,
  products,
  type TranslationsJson,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  productIdsSchema,
  type ProductIdsInput,
} from "@/features/products/schemas/admin-list";
import { requireAdmin } from "@/lib/auth/policies";
import { invalidateProductsCache } from "@/lib/cache/invalidate-public";
import { createId } from "@/lib/id";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { err, ok, type Result } from "@/lib/result";

function revalidateProducts(
  locale: string,
  product?: { id?: string; translations?: TranslationsJson; slug?: string },
): void {
  revalidatePath(`/${locale}/admin/products`);
  revalidatePath(`/${locale}/products`);
  for (const loc of locales) {
    revalidatePath(`/${loc}`);
  }
  invalidateProductsCache({
    productId: product?.id,
    slug: product?.slug,
    translations: product?.translations,
  });
}

/** Soft-deletes selected products (sets deletedAt). */
export async function softDeleteProductsAction(
  locale: string,
  raw: ProductIdsInput,
): Promise<Result<{ deleted: number }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = productIdsSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid product selection.");
  }

  await requireAdmin(locale as Locale);
  const now = new Date();
  let deleted = 0;

  for (const productId of parsed.data.productIds) {
    const [updated] = await getDb()
      .update(products)
      .set({ deletedAt: now, updatedAt: now, status: "ARCHIVED" })
      .where(and(eq(products.id, productId), isNull(products.deletedAt)))
      .returning({ id: products.id, translations: products.translations });
    if (updated) {
      deleted += 1;
      invalidateProductsCache({
        productId: updated.id,
        translations: updated.translations,
      });
    }
  }

  revalidatePath(`/${locale}/admin/products`);
  revalidatePath(`/${locale}/products`);
  for (const loc of locales) {
    revalidatePath(`/${loc}`);
  }
  return ok({ deleted });
}

/** Toggles featured flag for a product. */
export async function toggleProductFeaturedAction(
  locale: string,
  productId: string,
): Promise<Result<{ isFeatured: boolean }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  await requireAdmin(locale as Locale);
  const [existing] = await getDb()
    .select({
      id: products.id,
      isFeatured: products.isFeatured,
      translations: products.translations,
    })
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .limit(1);

  if (!existing) {
    return err("NOT_FOUND", "Product not found.");
  }

  const next = !existing.isFeatured;
  await getDb()
    .update(products)
    .set({ isFeatured: next, updatedAt: new Date() })
    .where(eq(products.id, existing.id));

  revalidateProducts(locale, {
    id: existing.id,
    translations: existing.translations,
  });
  return ok({ isFeatured: next });
}

/** Toggles storefront visibility (ACTIVE ↔ DRAFT). */
export async function toggleProductVisibilityAction(
  locale: string,
  productId: string,
): Promise<Result<{ status: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  await requireAdmin(locale as Locale);
  const result = await withTransaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: products.id,
        status: products.status,
        translations: products.translations,
        doorClassification: products.doorClassification,
      })
      .from(products)
      .where(and(eq(products.id, productId), isNull(products.deletedAt)))
      .for("update")
      .limit(1);

    if (!existing) return { error: "NOT_FOUND" as const };

    const nextStatus = existing.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    if (nextStatus === "ACTIVE") {
      const variants = await tx
        .select({
          itemType: productVariants.itemType,
          status: productVariants.status,
        })
        .from(productVariants)
        .where(eq(productVariants.productId, existing.id));
      const availableConfigurations = variants.filter(
        (variant) => variant.status !== "ARCHIVED",
      );
      if (availableConfigurations.length === 0) {
        return { error: "CONFIGURATION_REQUIRED" as const };
      }
      if (
        availableConfigurations.some(
          (variant) => variant.itemType !== "LEGACY",
        ) &&
        !existing.doorClassification
      ) {
        return { error: "CLASSIFICATION_REQUIRED" as const };
      }
    }

    await tx
      .update(products)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(products.id, existing.id));
    return {
      existing,
      nextStatus,
    };
  });

  if ("error" in result) {
    if (result.error === "NOT_FOUND") return err("NOT_FOUND", "Product not found.");
    if (result.error === "CONFIGURATION_REQUIRED") {
      return err(
        "VALIDATION_ERROR",
        getDictionary(locale as Locale).product.variant.publishNeedsConfiguration,
      );
    }
    return err(
      "VALIDATION_ERROR",
      getDictionary(locale as Locale).product.variant.publishNeedsClassification,
    );
  }

  revalidateProducts(locale, {
    id: result.existing.id,
    translations: result.existing.translations,
  });
  return ok({ status: result.nextStatus });
}

function withCopySuffix(translations: TranslationsJson): TranslationsJson {
  const next: TranslationsJson = {};
  for (const locale of ["hy", "en", "ru"] as const) {
    const entry = translations[locale];
    if (!entry) continue;
    next[locale] = {
      ...entry,
      title: `${entry.title} (copy)`,
      slug: `${entry.slug}-copy-${createId().slice(0, 8)}`,
    };
  }
  return next;
}

/** Duplicates a product as a DRAFT with a unique SKU/slug. */
export async function duplicateProductAction(
  locale: string,
  productId: string,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  await requireAdmin(locale as Locale);
  const [existing] = await getDb()
    .select()
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .limit(1);

  if (!existing) {
    return err("NOT_FOUND", "Product not found.");
  }

  const id = createId();
  const skuSuffix = createId().slice(0, 6);
  const translations = withCopySuffix(existing.translations);
  const variants = await getDb()
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, existing.id));

  await withTransaction(async (tx) => {
    await tx.insert(products).values({
      id,
      sku: `${existing.sku.slice(0, 100)}-COPY-${skuSuffix}`,
      translations,
      priceAmount: existing.priceAmount,
      compareAtAmount: existing.compareAtAmount,
      stockOnHand: 0,
      lowStockThreshold: existing.lowStockThreshold,
      status: "DRAFT",
      isFeatured: false,
      isUpcoming: existing.isUpcoming,
      badgeTranslations: existing.badgeTranslations,
      badgeStyle: existing.badgeStyle,
      badgePosition: existing.badgePosition,
      brandName: existing.brandName,
      modelName: existing.modelName,
      collectionName: existing.collectionName,
      doorClassification: existing.doorClassification,
      entranceEnvironments: existing.entranceEnvironments,
      structuralMaterial: existing.structuralMaterial,
      coreMaterial: existing.coreMaterial,
      surfaceCoating: existing.surfaceCoating,
      hasGlazing: existing.hasGlazing,
      glazingType: existing.glazingType,
      manufacturer: existing.manufacturer,
      countryOfManufacture: existing.countryOfManufacture,
      openingMechanism: existing.openingMechanism,
      frameSystem: existing.frameSystem,
      leafConfiguration: existing.leafConfiguration,
      performanceSpecifications: existing.performanceSpecifications,
    });

    for (const variant of variants) {
      await tx.insert(productVariants).values({
        ...variant,
        id: createId(),
        productId: id,
        sku: `${variant.sku.slice(0, 100)}-COPY-${createId().slice(0, 6)}`,
        stockOnHand: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  });

  revalidateProducts(locale, {
    id,
    translations,
  });
  return ok({ id });
}
