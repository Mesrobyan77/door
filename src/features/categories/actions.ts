"use server";

import { and, eq, isNull, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db/client";
import { categories, type TranslationsJson } from "@/db/schema";
import { persistCategoryImage, removeCategoryImage } from "@/features/categories/application/persist-category-media";
import { requireAdmin } from "@/lib/auth/policies";
import { invalidateProductsCache } from "@/lib/cache/invalidate-public";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

const createCategorySchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120),
  parentId: z.string().uuid().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

function buildTranslations(title: string, slug: string): TranslationsJson {
  const translation = { title, slug };
  return { hy: translation, en: translation, ru: translation };
}

function revalidateCategories(locale: string): void {
  revalidatePath(`/${locale}/admin/categories`);
  revalidatePath(`/${locale}/admin/products`);
  revalidatePath(`/${locale}/products`);
  invalidateProductsCache({ allProductDetails: true });
}

async function insertCategory(
  locale: Locale,
  data: CreateCategoryInput,
): Promise<Result<{ id: string }>> {
  if (data.parentId) {
    const [parent] = await getDb()
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, data.parentId),
          isNull(categories.deletedAt),
        ),
      )
      .limit(1);
    if (!parent) {
      return err("NOT_FOUND", "Parent category not found.");
    }
  }

  const [maxSort] = await getDb()
    .select({ value: max(categories.sortOrder) })
    .from(categories)
    .where(isNull(categories.deletedAt));

  const id = createId();
  await getDb().insert(categories).values({
    id,
    parentId: data.parentId,
    translations: buildTranslations(data.title, data.slug),
    sortOrder: (maxSort?.value ?? 0) + 1,
    status: data.status,
  });

  revalidateCategories(locale);
  return ok({ id });
}

/** Creates a category for the admin catalog. */
export async function createCategoryAction(
  locale: string,
  raw: CreateCategoryInput,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = createCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid category payload.");
  }

  await requireAdmin(locale as Locale);
  return insertCategory(locale, parsed.data);
}

/** Creates a category from the admin drawer (fields + optional image). */
export async function createCategoryFromDrawerAction(
  locale: string,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const rawParent = formData.get("parentId");
  const parsed = createCategorySchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    parentId:
      typeof rawParent === "string" && rawParent.trim()
        ? rawParent.trim()
        : null,
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid category payload.");
  }

  await requireAdmin(locale as Locale);
  const created = await insertCategory(locale, parsed.data);
  if (!created.ok) return created;

  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const mediaResult = await persistCategoryImage(created.value.id, image);
    if (mediaResult.error) {
      return err("VALIDATION_ERROR", mediaResult.error);
    }
    revalidateCategories(locale);
  }

  return created;
}

/** Updates a category from the admin drawer (fields + optional image). */
export async function updateCategoryFromDrawerAction(
  locale: string,
  categoryId: string,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const rawParent = formData.get("parentId");
  const parsed = createCategorySchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    parentId:
      typeof rawParent === "string" && rawParent.trim()
        ? rawParent.trim()
        : null,
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid category payload.");
  }

  if (parsed.data.parentId === categoryId) {
    return err("VALIDATION_ERROR", "A category cannot be its own parent.");
  }

  await requireAdmin(locale as Locale);

  const [existing] = await getDb()
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
    .limit(1);

  if (!existing) {
    return err("NOT_FOUND", "Category not found.");
  }

  if (parsed.data.parentId) {
    const [parent] = await getDb()
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, parsed.data.parentId),
          isNull(categories.deletedAt),
        ),
      )
      .limit(1);
    if (!parent) {
      return err("NOT_FOUND", "Parent category not found.");
    }
  }

  await getDb()
    .update(categories)
    .set({
      parentId: parsed.data.parentId,
      translations: buildTranslations(parsed.data.title, parsed.data.slug),
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, existing.id));

  const image = formData.get("image");
  const removeImage = formData.get("removeImage") === "1";

  if (image instanceof File && image.size > 0) {
    const mediaResult = await persistCategoryImage(existing.id, image);
    if (mediaResult.error) {
      return err("VALIDATION_ERROR", mediaResult.error);
    }
  } else if (removeImage) {
    await removeCategoryImage(existing.id);
  }

  revalidateCategories(locale);
  return ok({ id: existing.id });
}

/** Soft-deletes a category. */
export async function deleteCategoryAction(
  locale: string,
  categoryId: string,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  await requireAdmin(locale as Locale);

  const [updated] = await getDb()
    .update(categories)
    .set({
      deletedAt: new Date(),
      status: "ARCHIVED",
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
    .returning({ id: categories.id });

  if (!updated) {
    return err("NOT_FOUND", "Category not found.");
  }

  revalidateCategories(locale);
  return ok({ id: updated.id });
}

const reorderCategoriesSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

/** Persists admin category table order via sortOrder (1-based). */
export async function reorderCategoriesAction(
  locale: string,
  raw: z.infer<typeof reorderCategoriesSchema>,
): Promise<Result<{ updated: number }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = reorderCategoriesSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid category order.");
  }

  await requireAdmin(locale as Locale);

  const uniqueIds = [...new Set(parsed.data.orderedIds)];
  if (uniqueIds.length !== parsed.data.orderedIds.length) {
    return err("VALIDATION_ERROR", "Duplicate category ids in order.");
  }

  const existing = await getDb()
    .select({ id: categories.id })
    .from(categories)
    .where(and(isNull(categories.deletedAt)));

  if (existing.length !== uniqueIds.length) {
    return err(
      "VALIDATION_ERROR",
      "Category list is out of date. Refresh and try again.",
    );
  }

  const existingSet = new Set(existing.map((row) => row.id));
  for (const id of uniqueIds) {
    if (!existingSet.has(id)) {
      return err("NOT_FOUND", "Category not found.");
    }
  }

  const now = new Date();
  await Promise.all(
    uniqueIds.map((id, index) =>
      getDb()
        .update(categories)
        .set({ sortOrder: index + 1, updatedAt: now })
        .where(eq(categories.id, id)),
    ),
  );

  revalidateCategories(locale);
  return ok({ updated: uniqueIds.length });
}
