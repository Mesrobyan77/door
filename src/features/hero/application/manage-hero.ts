"use server";

import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

import { auditLogs, heroSlides, mediaAssets, type HeroTranslationsJson } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  persistHeroImage,
  removeHeroImage,
} from "@/features/hero/application/persist-hero-media";
import {
  heroRuleErrorMessage,
  validateHeroTranslations,
} from "@/features/hero/domain/hero-rules";
import {
  deleteHeroSlideSchema,
  reorderHeroSlideSchema,
  toggleHeroSlideSchema,
  upsertHeroSlideSchema,
  type DeleteHeroSlideInput,
  type ReorderHeroSlideInput,
  type ToggleHeroSlideInput,
  type UpsertHeroSlideInput,
} from "@/features/hero/schemas/admin-hero";
import { requireAdmin } from "@/lib/auth/policies";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

function buildTranslations(
  data: UpsertHeroSlideInput,
  existing?: HeroTranslationsJson,
): HeroTranslationsJson {
  const previous =
    existing?.en ?? existing?.hy ?? existing?.ru ?? undefined;

  const copy = {
    title: data.title,
    subtitle: data.subtitle || undefined,
    buttonLabel: previous?.buttonLabel,
    buttonUrl: previous?.buttonUrl,
  };

  return { hy: copy, en: copy, ru: copy };
}

function parseModalFormData(formData: FormData): UpsertHeroSlideInput | null {
  const parsed = upsertHeroSlideSchema.safeParse({
    title: formData.get("title"),
    subtitle: String(formData.get("subtitle") ?? "") || undefined,
  });
  return parsed.success ? parsed.data : null;
}

function revalidateHero(locale: string, slideId?: string): void {
  revalidatePath(`/${locale}/admin/hero`);
  if (slideId) {
    revalidatePath(`/${locale}/admin/hero/${slideId}`);
  }
  for (const loc of ["hy", "en", "ru"] as const) {
    revalidatePath(`/${loc}`);
  }
  updateTag(CACHE_TAGS.hero);
}

/** Creates a hero slide from the admin modal (fields + optional image). */
export async function createHeroSlideAction(
  locale: string,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const data = parseModalFormData(formData);
  if (!data) {
    return err("VALIDATION_ERROR", "Invalid hero slide payload.");
  }

  const translations = buildTranslations(data);
  const ruleError = validateHeroTranslations(translations);
  if (ruleError) {
    return err(ruleError, heroRuleErrorMessage(ruleError));
  }

  const actor = await requireAdmin(locale as Locale);
  const id = createId();

  try {
    await withTransaction(async (tx) => {
      await tx.insert(heroSlides).values({
        id,
        translations,
        sortOrder: 0,
        isActive: true,
      });

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "hero.create",
        targetType: "hero_slide",
        targetId: id,
        afterDiff: {
          title: data.title,
          isActive: true,
          sortOrder: 0,
        },
        correlationId: createId(),
      });
    });

    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      const mediaResult = await persistHeroImage(id, image);
      if (mediaResult.error) {
        return err("VALIDATION_ERROR", mediaResult.error);
      }
    }

    revalidateHero(locale, id);
    return ok({ id });
  } catch {
    return err("HERO_CREATE_FAILED", "Unable to create hero slide.");
  }
}

/** Updates an existing hero slide from the admin modal. */
export async function updateHeroSlideAction(
  locale: string,
  slideId: string,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const data = parseModalFormData(formData);
  if (!data) {
    return err("VALIDATION_ERROR", "Invalid hero slide payload.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    const existing = await withTransaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(heroSlides)
        .where(eq(heroSlides.id, slideId))
        .for("update")
        .limit(1);

      if (!row) {
        throw new Error("NOT_FOUND");
      }

      const translations = buildTranslations(data, row.translations);
      const ruleError = validateHeroTranslations(translations);
      if (ruleError) {
        throw new Error(`RULE:${ruleError}`);
      }

      await tx
        .update(heroSlides)
        .set({
          translations,
          updatedAt: new Date(),
        })
        .where(eq(heroSlides.id, slideId));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "hero.update",
        targetType: "hero_slide",
        targetId: slideId,
        beforeDiff: {
          isActive: row.isActive,
          sortOrder: row.sortOrder,
        },
        afterDiff: {
          title: data.title,
          isActive: row.isActive,
          sortOrder: row.sortOrder,
        },
        correlationId: createId(),
      });

      return row;
    });

    if (formData.get("removeImage") === "1") {
      await removeHeroImage(slideId);
    }

    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      const mediaResult = await persistHeroImage(slideId, image);
      if (mediaResult.error) {
        return err("VALIDATION_ERROR", mediaResult.error);
      }
    }

    revalidateHero(locale, existing.id);
    return ok({ id: slideId });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return err("NOT_FOUND", "Hero slide not found.");
    }
    if (error instanceof Error && error.message.startsWith("RULE:")) {
      const code = error.message.slice(5) as
        | "TITLE_REQUIRED"
        | "INVALID_BUTTON_URL"
        | "BUTTON_LABEL_WITHOUT_URL"
        | "BUTTON_URL_WITHOUT_LABEL";
      return err(code, heroRuleErrorMessage(code));
    }
    return err("HERO_UPDATE_FAILED", "Unable to update hero slide.");
  }
}

/** Publishes or unpublishes a hero slide. */
export async function toggleHeroSlideAction(
  locale: string,
  raw: ToggleHeroSlideInput,
): Promise<Result<{ id: string; isActive: boolean }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = toggleHeroSlideSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid publish payload.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    const result = await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(heroSlides)
        .where(eq(heroSlides.id, parsed.data.slideId))
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      await tx
        .update(heroSlides)
        .set({ isActive: parsed.data.isActive, updatedAt: new Date() })
        .where(eq(heroSlides.id, existing.id));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "hero.toggle",
        targetType: "hero_slide",
        targetId: existing.id,
        beforeDiff: { isActive: existing.isActive },
        afterDiff: { isActive: parsed.data.isActive },
        correlationId: createId(),
      });

      return { id: existing.id, isActive: parsed.data.isActive };
    });

    revalidateHero(locale, result.id);
    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return err("NOT_FOUND", "Hero slide not found.");
    }
    return err("HERO_TOGGLE_FAILED", "Unable to publish hero slide.");
  }
}

/** Moves a slide up or down by swapping sortOrder with its neighbor. */
export async function reorderHeroSlideAction(
  locale: string,
  raw: ReorderHeroSlideInput,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = reorderHeroSlideSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid reorder payload.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    await withTransaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(heroSlides)
        .where(eq(heroSlides.id, parsed.data.slideId))
        .for("update")
        .limit(1);

      if (!current) {
        throw new Error("NOT_FOUND");
      }

      const [neighbor] =
        parsed.data.direction === "up"
          ? await tx
              .select()
              .from(heroSlides)
              .where(and(lt(heroSlides.sortOrder, current.sortOrder)))
              .orderBy(desc(heroSlides.sortOrder))
              .for("update")
              .limit(1)
          : await tx
              .select()
              .from(heroSlides)
              .where(and(gt(heroSlides.sortOrder, current.sortOrder)))
              .orderBy(asc(heroSlides.sortOrder))
              .for("update")
              .limit(1);

      if (!neighbor) {
        throw new Error("NO_NEIGHBOR");
      }

      const lockedNeighbor = neighbor;

      const now = new Date();
      const currentOrder = current.sortOrder;
      const neighborOrder = lockedNeighbor.sortOrder;

      await tx
        .update(heroSlides)
        .set({ sortOrder: neighborOrder, updatedAt: now })
        .where(eq(heroSlides.id, current.id));
      await tx
        .update(heroSlides)
        .set({ sortOrder: currentOrder, updatedAt: now })
        .where(eq(heroSlides.id, lockedNeighbor.id));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "hero.reorder",
        targetType: "hero_slide",
        targetId: current.id,
        beforeDiff: { sortOrder: currentOrder },
        afterDiff: { sortOrder: neighborOrder },
        correlationId: createId(),
        context: {
          direction: parsed.data.direction,
          swappedWith: lockedNeighbor.id,
        },
      });
    });

    revalidateHero(locale, parsed.data.slideId);
    return ok({ id: parsed.data.slideId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "NOT_FOUND") {
      return err("NOT_FOUND", "Hero slide not found.");
    }
    if (code === "NO_NEIGHBOR") {
      return err("NO_NEIGHBOR", "Slide is already at the edge.");
    }
    return err("HERO_REORDER_FAILED", "Unable to reorder hero slide.");
  }
}

/** Deletes a hero slide and its media with audit. */
export async function deleteHeroSlideAction(
  locale: string,
  raw: DeleteHeroSlideInput,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = deleteHeroSlideSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid delete payload.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(heroSlides)
        .where(eq(heroSlides.id, parsed.data.slideId))
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      await tx
        .delete(mediaAssets)
        .where(eq(mediaAssets.heroSlideId, existing.id));

      await tx.delete(heroSlides).where(eq(heroSlides.id, existing.id));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "hero.delete",
        targetType: "hero_slide",
        targetId: existing.id,
        beforeDiff: {
          isActive: existing.isActive,
          sortOrder: existing.sortOrder,
        },
        correlationId: createId(),
      });
    });

    revalidateHero(locale, parsed.data.slideId);
    return ok({ id: parsed.data.slideId });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return err("NOT_FOUND", "Hero slide not found.");
    }
    return err("HERO_DELETE_FAILED", "Unable to delete hero slide.");
  }
}
