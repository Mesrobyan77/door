import { ORDER_STATUSES, type OrderStatus } from '@/features/orders/domain/order-status';
import { DEFAULT_RATES_FROM_AMD } from '@/lib/fx/default-rates';
import { normalizeRateDecimalString, parseRateToFixed } from '@/lib/money/convert';

export const STORE_SETTING_KEYS = [
  'store.identity',
  'store.branding',
  'store.social',
  'store.maintenance',
  'store.stacking',
  'store.revenue',
  'store.globalDiscount',
  'store.fxRates',
  'store.catalogDemo',
  'store.homepage',
] as const;

export type StoreSettingKey = (typeof STORE_SETTING_KEYS)[number];

export type StoreIdentity = {
  name: string;
  supportEmail: string;
  phone?: string;
};

export type StoreBranding = {
  primaryColor?: string;
  logoObjectKey?: string;
};

export type StoreSocial = {
  instagram?: string;
  facebook?: string;
  telegram?: string;
};

export type StoreMaintenance = {
  enabled: boolean;
  message?: string;
};

export type StoreStacking = {
  allowCouponWithAutomatic: boolean;
};

export type StoreRevenue = {
  /** Order statuses counted toward revenue metrics. */
  statuses: OrderStatus[];
};

export type StoreGlobalDiscount = {
  /** Store-wide percentage discount (1–100), or null when disabled. */
  percentage: number | null;
};

/** Quote major units per 1 AMD (e.g. usd: "0.0026" → 1 AMD = 0.0026 USD). */
export type StoreFxRates = {
  usd: string;
  rub: string;
};

export type StoreCatalogDemo = {
  enabled: boolean;
  messages: Partial<Record<'hy' | 'en' | 'ru', string>>;
  pexelsAttribution?: {
    labels: Partial<Record<'hy' | 'en' | 'ru', string>>;
    url: string;
  };
};

type LocalizedText = Partial<Record<'hy' | 'en' | 'ru', string>>;

export type StoreHomepage = {
  featuredTitle: LocalizedText;
  viewAllLabel: LocalizedText;
  emptyFeaturedLabel: LocalizedText;
  categoriesTitle: LocalizedText;
  brandsTitle: LocalizedText;
  about: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    ctaLabel: LocalizedText;
  };
  benefits: Array<{ title: LocalizedText; description: LocalizedText }>;
  brands: string[];
  footerLinks: Array<{ label: LocalizedText; href: string }>;
};

const EMPTY_HOMEPAGE: StoreHomepage = {
  featuredTitle: {},
  viewAllLabel: {},
  emptyFeaturedLabel: {},
  categoriesTitle: {},
  brandsTitle: {},
  about: { eyebrow: {}, title: {}, description: {}, ctaLabel: {} },
  benefits: [],
  brands: [],
  footerLinks: [],
};

export function parseHomepage(value: unknown): StoreHomepage {
  if (!value || typeof value !== 'object') return EMPTY_HOMEPAGE;
  const root = value as Record<string, unknown>;
  const localized = (input: unknown): LocalizedText => {
    if (!input || typeof input !== 'object') return {};
    const source = input as Record<string, unknown>;
    return Object.fromEntries(
      ['hy', 'en', 'ru'].flatMap((locale) => {
        const text = source[locale];
        return typeof text === 'string' && text.trim()
          ? [[locale, text.trim().slice(0, 1000)]]
          : [];
      }),
    ) as LocalizedText;
  };
  const about =
    root.about && typeof root.about === 'object' ? (root.about as Record<string, unknown>) : {};
  const benefits = Array.isArray(root.benefits)
    ? root.benefits
        .flatMap((entry) => {
          if (!entry || typeof entry !== 'object') return [];
          const item = entry as Record<string, unknown>;
          return [{ title: localized(item.title), description: localized(item.description) }];
        })
        .slice(0, 12)
    : [];
  const brands = Array.isArray(root.brands)
    ? root.brands
        .filter((brand): brand is string => typeof brand === 'string' && Boolean(brand.trim()))
        .map((brand) => brand.trim().slice(0, 120))
        .slice(0, 20)
    : [];
  const footerLinks = Array.isArray(root.footerLinks)
    ? root.footerLinks
        .flatMap((entry) => {
          if (!entry || typeof entry !== 'object') return [];
          const item = entry as Record<string, unknown>;
          return typeof item.href === 'string' && item.href.startsWith('/')
            ? [{ label: localized(item.label), href: item.href.slice(0, 300) }]
            : [];
        })
        .slice(0, 20)
    : [];
  return {
    featuredTitle: localized(root.featuredTitle),
    viewAllLabel: localized(root.viewAllLabel),
    emptyFeaturedLabel: localized(root.emptyFeaturedLabel),
    categoriesTitle: localized(root.categoriesTitle),
    brandsTitle: localized(root.brandsTitle),
    about: {
      eyebrow: localized(about.eyebrow),
      title: localized(about.title),
      description: localized(about.description),
      ctaLabel: localized(about.ctaLabel),
    },
    benefits,
    brands,
    footerLinks,
  };
}

export const DEFAULT_FX_RATES: StoreFxRates = {
  usd: DEFAULT_RATES_FROM_AMD.USD,
  rub: DEFAULT_RATES_FROM_AMD.RUB,
};

function isPositiveRateString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    parseRateToFixed(value);
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_REVENUE_STATUSES: OrderStatus[] = [
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

export function isStoreSettingKey(value: string): value is StoreSettingKey {
  return (STORE_SETTING_KEYS as readonly string[]).includes(value);
}

export function parseRevenueStatuses(value: unknown): OrderStatus[] {
  if (!value || typeof value !== 'object') {
    return [...DEFAULT_REVENUE_STATUSES];
  }

  const statuses = (value as { statuses?: unknown }).statuses;
  if (!Array.isArray(statuses)) {
    return [...DEFAULT_REVENUE_STATUSES];
  }

  const parsed = statuses.filter(
    (item): item is OrderStatus =>
      typeof item === 'string' &&
      (ORDER_STATUSES as readonly string[]).includes(item) &&
      item !== 'CANCELLED' &&
      item !== 'REFUNDED' &&
      item !== 'PENDING',
  );

  return parsed.length > 0 ? parsed : [...DEFAULT_REVENUE_STATUSES];
}

export function parseMaintenance(value: unknown): StoreMaintenance {
  if (!value || typeof value !== 'object') {
    return { enabled: false };
  }

  const record = value as Record<string, unknown>;
  return {
    enabled: record.enabled === true,
    message: typeof record.message === 'string' ? record.message.slice(0, 500) : undefined,
  };
}

export function parseCatalogDemo(value: unknown): StoreCatalogDemo {
  if (!value || typeof value !== 'object') {
    return { enabled: false, messages: {} };
  }

  const record = value as Record<string, unknown>;
  const rawMessages =
    record.messages && typeof record.messages === 'object'
      ? (record.messages as Record<string, unknown>)
      : {};
  const rawAttribution =
    record.pexelsAttribution && typeof record.pexelsAttribution === 'object'
      ? (record.pexelsAttribution as Record<string, unknown>)
      : null;
  const rawLabels =
    rawAttribution?.labels && typeof rawAttribution.labels === 'object'
      ? (rawAttribution.labels as Record<string, unknown>)
      : {};
  const localized = (source: Record<string, unknown>) =>
    Object.fromEntries(
      ['hy', 'en', 'ru'].flatMap((locale) => {
        const text = source[locale];
        return typeof text === 'string' && text.trim() ? [[locale, text.trim().slice(0, 500)]] : [];
      }),
    ) as Partial<Record<'hy' | 'en' | 'ru', string>>;
  const url = rawAttribution?.url;

  return {
    enabled: record.enabled === true,
    messages: localized(rawMessages),
    pexelsAttribution:
      typeof url === 'string' && url === 'https://www.pexels.com/'
        ? { labels: localized(rawLabels), url }
        : undefined,
  };
}

export function parseStacking(value: unknown): StoreStacking {
  if (!value || typeof value !== 'object') {
    return { allowCouponWithAutomatic: false };
  }

  return {
    allowCouponWithAutomatic:
      (value as { allowCouponWithAutomatic?: unknown }).allowCouponWithAutomatic === true,
  };
}

export function parseGlobalDiscount(value: unknown): StoreGlobalDiscount {
  if (!value || typeof value !== 'object') {
    return { percentage: null };
  }

  const raw = (value as { percentage?: unknown }).percentage;
  if (raw === null || raw === undefined || raw === '') {
    return { percentage: null };
  }

  const percentage = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100) {
    return { percentage: null };
  }

  return { percentage };
}

export function parseIdentity(value: unknown): StoreIdentity {
  if (!value || typeof value !== 'object') {
    return { name: 'White Shop', supportEmail: 'support@example.com' };
  }

  const record = value as Record<string, unknown>;
  return {
    name:
      typeof record.name === 'string' && record.name.trim()
        ? record.name.trim().slice(0, 120)
        : 'White Shop',
    supportEmail:
      typeof record.supportEmail === 'string' && record.supportEmail.includes('@')
        ? record.supportEmail.trim().toLowerCase().slice(0, 254)
        : 'support@example.com',
    phone: typeof record.phone === 'string' ? record.phone.trim().slice(0, 40) : undefined,
  };
}

export function parseFxRates(value: unknown): StoreFxRates {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_FX_RATES };
  }

  const record = value as Record<string, unknown>;
  return {
    usd: isPositiveRateString(record.usd)
      ? normalizeRateDecimalString(record.usd)
      : DEFAULT_FX_RATES.usd,
    rub: isPositiveRateString(record.rub)
      ? normalizeRateDecimalString(record.rub)
      : DEFAULT_FX_RATES.rub,
  };
}
