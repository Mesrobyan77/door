"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth/policies";
import { isLocale, type Locale } from "@/lib/i18n/config";

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(5).max(40),
});

export type UpdateProfileActionState = {
  error?: string;
  success?: string;
};

/**
 * Updates the signed-in customer's personal fields used by profile and checkout.
 */
export async function updateProfileAction(
  locale: string,
  _previousState: UpdateProfileActionState,
  formData: FormData,
): Promise<UpdateProfileActionState> {
  if (!isLocale(locale)) {
    return { error: "Invalid locale." };
  }

  const user = await requireUser(locale as Locale);
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: "Please check the form fields and try again." };
  }

  if (parsed.data.email !== user.email) {
    const [existing] = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.email, parsed.data.email), ne(users.id, user.id)),
      )
      .limit(1);

    if (existing) {
      return { error: "That email is already in use." };
    }
  }

  await getDb()
    .update(users)
    .set({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/profile/personal-information`);
  revalidatePath(`/${locale}/profile/addresses`);
  revalidatePath(`/${locale}/checkout`);

  return { success: "Personal information saved." };
}
