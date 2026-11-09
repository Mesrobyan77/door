import 'server-only';

import { eq, or } from 'drizzle-orm';
import { cache } from 'react';

import { getDb } from '@/db/client';
import { mediaAssets, storeSettings } from '@/db/schema';
import {
  parseFxRates,
  parseCatalogDemo,
  parseGlobalDiscount,
  parseIdentity,
  parseMaintenance,
  parseHomepage,
  parseRevenueStatuses,
  parseStacking,
  type StoreFxRates,
  type StoreCatalogDemo,
  type StoreGlobalDiscount,
  type StoreIdentity,
  type StoreMaintenance,
  type StoreHomepage,
  type StoreRevenue,
  type StoreStacking,
  type StoreSettingKey,
} from '@/features/settings/domain/store-settings';

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
  return parseIdentity(await getSettingValue('store.identity'));
}

export const getStoreMaintenance = cache(async (): Promise<StoreMaintenance> => {
  return parseMaintenance(await getSettingValue('store.maintenance'));
});

export async function getStoreStacking(): Promise<StoreStacking> {
  return parseStacking(await getSettingValue('store.stacking'));
}

export async function getStoreRevenue(): Promise<StoreRevenue> {
  return {
    statuses: parseRevenueStatuses(await getSettingValue('store.revenue')),
  };
}

export const getStoreGlobalDiscount = cache(async (): Promise<StoreGlobalDiscount> => {
  return parseGlobalDiscount(await getSettingValue('store.globalDiscount'));
});

export const getStoreFxRates = cache(async (): Promise<StoreFxRates> => {
  return parseFxRates(await getSettingValue('store.fxRates'));
});

export const getStoreCatalogDemo = cache(async (): Promise<StoreCatalogDemo> => {
  return parseCatalogDemo(await getSettingValue('store.catalogDemo'));
});

export const getStoreHomepage = cache(async (): Promise<StoreHomepage> => {
  return parseHomepage(await getSettingValue('store.homepage'));
});

/** Presentation-only branding; configured artwork takes precedence over the new concept. */
export const getStorefrontBranding = cache(async () => {
  const [rawIdentity, branding, social] = await Promise.all([
    getSettingValue('store.identity'),
    getSettingValue('store.branding'),
    getSettingValue('store.social'),
  ]);
  const logoKey = typeof branding?.logoObjectKey === 'string' ? branding.logoObjectKey : null;
  let logoUrl: string | null = null;
  if (logoKey) {
    const [asset] = await getDb()
      .select({ url: mediaAssets.secureUrl })
      .from(mediaAssets)
      .where(
        or(
          eq(mediaAssets.legacyObjectKey, logoKey),
          eq(mediaAssets.cloudinaryPublicId, logoKey),
          eq(
            mediaAssets.id,
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(logoKey)
              ? logoKey
              : '00000000-0000-0000-0000-000000000000',
          ),
        ),
      )
      .limit(1);
    logoUrl = asset?.url ?? (logoKey.startsWith('https://res.cloudinary.com/') ? logoKey : null);
  }
  const phone =
    typeof rawIdentity?.phone === 'string' && !/[xX]/.test(rawIdentity.phone)
      ? rawIdentity.phone
      : null;
  const email =
    typeof rawIdentity?.supportEmail === 'string' &&
    !/example\.|\.test$/.test(rawIdentity.supportEmail)
      ? rawIdentity.supportEmail
      : null;
  const socialLinks = Object.entries(social ?? {}).flatMap(([label, url]) =>
    typeof url === 'string' &&
    /^https:\/\//.test(url) &&
    !/^https:\/\/(www\.)?(instagram|facebook|t\.me)\.?[a-z]*\/?$/.test(url)
      ? [{ label, url }]
      : [],
  );
  const configuredName = typeof rawIdentity?.name === 'string' ? rawIdentity.name.trim() : '';
  const name =
    configuredName && !/white[\s-]*shop|eco[\s-]*doors/i.test(configuredName)
      ? configuredName
      : 'Hdoors';
  return {
    name,
    logoUrl: logoUrl ?? '/assets/branding/hdoors-concept-v1.png',
    phone,
    email,
    socialLinks,
  };
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
  const [identity, maintenance, stacking, revenue, fxRates, branding, social] = await Promise.all([
    getStoreIdentity(),
    getStoreMaintenance(),
    getStoreStacking(),
    getStoreRevenue(),
    getStoreFxRates(),
    getSettingValue('store.branding'),
    getSettingValue('store.social'),
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
