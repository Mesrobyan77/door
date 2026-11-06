import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";

import { getDb } from "@/db/client";
import { storeSettings } from "@/db/schema";
import {
  parseFxRates,
  parseGlobalDiscount,
  parseIdentity,
  parseMaintenance,
  parseRevenueStatuses,
  parseStacking,
  type StoreFxRates,
  type StoreGlobalDiscount,
  type StoreIdentity,
  type StoreMaintenance,
  type StoreRevenue,
  type StoreStacking,
  type StoreSettingKey,
} from "@/features/settings/domain/store-settings";

const getSettingValue = cache(
  async (key: StoreSettingKey): Promise<Record<string, unknown> | null> => {
    const [row] = await getDb()
      .select({ value: storeSettings.value })
      .from(storeSettings)
      .where(eq(storeSettings.key, key))
      .limit(1);

    return row?.value ?? null;
  },
);

export async function getStoreIdentity(): Promise<StoreIdentity> {
  return parseIdentity(await getSettingValue("store.identity"));
}

export const getStoreMaintenance = cache(
  async (): Promise<StoreMaintenance> => {
    return parseMaintenance(await getSettingValue("store.maintenance"));
  },
);

export async function getStoreStacking(): Promise<StoreStacking> {
  return parseStacking(await getSettingValue("store.stacking"));
}

export async function getStoreRevenue(): Promise<StoreRevenue> {
  return {
    statuses: parseRevenueStatuses(await getSettingValue("store.revenue")),
  };
}

export const getStoreGlobalDiscount = cache(
  async (): Promise<StoreGlobalDiscount> => {
    return parseGlobalDiscount(await getSettingValue("store.globalDiscount"));
  },
);

export const getStoreFxRates = cache(async (): Promise<StoreFxRates> => {
  return parseFxRates(await getSettingValue("store.fxRates"));
});

export async function getAllStoreSettings(): Promise<{
  identity: StoreIdentity;
  maintenance: StoreMaintenance;
  stacking: StoreStacking;
  revenue: StoreRevenue;
  fxRates: StoreFxRates;
  branding: Record<string, unknown>;
  social: Record<string, unknown>;
}> {
  const [identity, maintenance, stacking, revenue, fxRates, branding, social] =
    await Promise.all([
      getStoreIdentity(),
      getStoreMaintenance(),
      getStoreStacking(),
      getStoreRevenue(),
      getStoreFxRates(),
      getSettingValue("store.branding"),
      getSettingValue("store.social"),
    ]);

  return {
    identity,
    maintenance,
    stacking,
    revenue,
    fxRates,
    branding: branding ?? {},
    social: social ?? {},
  };
}
