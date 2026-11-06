import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { deliveryRules } from "@/db/schema";

export type AdminDeliveryLocation = {
  id: string;
  country: string;
  city: string;
  priceAmount: number;
  freeThresholdAmount: number | null;
  priority: number;
};

export type CheckoutDeliveryOption = {
  id: string;
  country: string;
  city: string;
  priceAmount: number;
  freeThresholdAmount: number | null;
  label: string;
};

function locationLabel(country: string, city: string | null): string {
  const cityPart = city?.trim();
  if (cityPart) {
    return `${cityPart}, ${country}`;
  }
  return country;
}

/** Lists all delivery locations for the admin table. */
export async function listAdminDeliveryLocations(): Promise<
  AdminDeliveryLocation[]
> {
  const rows = await getDb()
    .select({
      id: deliveryRules.id,
      country: deliveryRules.countryCode,
      city: deliveryRules.city,
      priceAmount: deliveryRules.priceAmount,
      freeThresholdAmount: deliveryRules.freeThresholdAmount,
      priority: deliveryRules.priority,
    })
    .from(deliveryRules)
    .where(eq(deliveryRules.isActive, true))
    .orderBy(desc(deliveryRules.priority), asc(deliveryRules.city));

  return rows.map((row) => ({
    id: row.id,
    country: row.country,
    city: row.city?.trim() || "",
    priceAmount: row.priceAmount,
    freeThresholdAmount: row.freeThresholdAmount,
    priority: row.priority,
  }));
}

/** Active delivery locations shown in the checkout location dropdown. */
export async function listCheckoutDeliveryOptions(): Promise<
  CheckoutDeliveryOption[]
> {
  const rows = await getDb()
    .select({
      id: deliveryRules.id,
      country: deliveryRules.countryCode,
      city: deliveryRules.city,
      priceAmount: deliveryRules.priceAmount,
      freeThresholdAmount: deliveryRules.freeThresholdAmount,
    })
    .from(deliveryRules)
    .where(eq(deliveryRules.isActive, true))
    .orderBy(desc(deliveryRules.priority), asc(deliveryRules.city));

  return rows.map((row) => {
    const city = row.city?.trim() || "";
    return {
      id: row.id,
      country: row.country,
      city,
      priceAmount: row.priceAmount,
      freeThresholdAmount: row.freeThresholdAmount,
      label: locationLabel(row.country, city || null),
    };
  });
}
