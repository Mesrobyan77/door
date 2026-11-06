import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import { addresses } from "@/db/schema";

export type CustomerAddressListItem = {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  recipientFirstName: string;
  recipientLastName: string;
  phone: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

/** Lists non-archived addresses for a customer (defaults first). */
export async function listCustomerAddresses(
  userId: string,
): Promise<CustomerAddressListItem[]> {
  return getDb()
    .select({
      id: addresses.id,
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      region: addresses.region,
      postalCode: addresses.postalCode,
      countryCode: addresses.countryCode,
      recipientFirstName: addresses.recipientFirstName,
      recipientLastName: addresses.recipientLastName,
      phone: addresses.phone,
      isDefaultShipping: addresses.isDefaultShipping,
      isDefaultBilling: addresses.isDefaultBilling,
    })
    .from(addresses)
    .where(
      and(eq(addresses.userId, userId), isNull(addresses.archivedAt)),
    )
    .orderBy(
      desc(addresses.isDefaultShipping),
      asc(addresses.createdAt),
    );
}

/** Loads the customer's default shipping address when present. */
export async function getDefaultShippingAddress(
  userId: string,
): Promise<CustomerAddressListItem | null> {
  const [row] = await getDb()
    .select({
      id: addresses.id,
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      region: addresses.region,
      postalCode: addresses.postalCode,
      countryCode: addresses.countryCode,
      recipientFirstName: addresses.recipientFirstName,
      recipientLastName: addresses.recipientLastName,
      phone: addresses.phone,
      isDefaultShipping: addresses.isDefaultShipping,
      isDefaultBilling: addresses.isDefaultBilling,
    })
    .from(addresses)
    .where(
      and(
        eq(addresses.userId, userId),
        isNull(addresses.archivedAt),
        eq(addresses.isDefaultShipping, true),
      ),
    )
    .limit(1);

  return row ?? null;
}
