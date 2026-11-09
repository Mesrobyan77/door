import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { config as loadEnv } from 'dotenv';
import { eq, inArray } from 'drizzle-orm';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWebSocket } from 'drizzle-orm/neon-serverless';
import { v7 as uuidv7 } from 'uuid';
import ws from 'ws';
import { z } from 'zod';

import { validateHdoorsCatalog } from '@/db/import/hdoors-catalog-schema';
import * as schema from '@/db/schema';
import {
  getCloudinaryImageProvider,
  uploadImageToCloudinaryProvider,
} from '@/lib/media/cloudinary-provider';
import { validateImageFile } from '@/lib/media/image-file';

const directory = path.resolve(process.cwd(), 'data/imports/hdoors-initial-catalog');
const retainedDraftRecordKey = 'belwooddoors-event-1-graphite-900';
const developmentStock = 3;
const expectedDevelopmentHost = 'ep-ancient-poetry-bdwveofc';
const productionHost = 'ep-rapid-breeze-bdsqy769';
const imageSourceSchema = z.object({
  version: z.literal(2),
  images: z
    .array(
      z.object({
        recordKey: z.string().min(1),
        slot: z.number().int().min(0).max(2),
        pexelsPhotoId: z.number().int().positive(),
        photoPageUrl: z.string().url(),
        photographer: z.string().min(1),
        photographerUrl: z.string().url(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }),
    )
    .length(87),
});
type ImageSource = z.infer<typeof imageSourceSchema>['images'][number];
type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: { original: string };
};

function loadEnvironment() {
  loadEnv({ path: path.resolve(process.cwd(), '.env'), quiet: true });
  loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true, quiet: true });
}
function args() {
  const values = new Set(process.argv.slice(2));
  if (!values.has('--target=development')) throw new Error('Pass --target=development explicitly.');
  return { apply: values.has('--apply') };
}
function safeUrl(raw: string): URL {
  const url = new URL(raw);
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.DATABASE_ENVIRONMENT !== 'development' ||
    !url.hostname.startsWith(expectedDevelopmentHost) ||
    url.hostname.startsWith(productionHost)
  ) {
    throw new Error(`Refusing unsafe publication target ${url.hostname}/${url.pathname.slice(1)}.`);
  }
  return url;
}
const objectKey = (source: ImageSource) =>
  `pexels:${source.pexelsPhotoId}:${source.recordKey}:${source.slot}`;
const barePublicId = (source: ImageSource) =>
  `hdoors-${source.recordKey}-pexels-${source.pexelsPhotoId}${source.slot === 0 ? '' : `-s${source.slot}`}`;
const fullPublicId = (source: ImageSource) => `door/product/${barePublicId(source)}`;

async function fetchPhoto(source: ImageSource, apiKey: string): Promise<PexelsPhoto> {
  const response = await fetch(`https://api.pexels.com/v1/photos/${source.pexelsPhotoId}`, {
    headers: { Authorization: apiKey },
  });
  if (!response.ok)
    throw new Error(`Pexels photo ${source.pexelsPhotoId} returned ${response.status}.`);
  const photo = (await response.json()) as PexelsPhoto;
  if (
    photo.id !== source.pexelsPhotoId ||
    photo.url !== source.photoPageUrl ||
    photo.photographer !== source.photographer ||
    photo.photographer_url !== source.photographerUrl ||
    photo.width !== source.width ||
    photo.height !== source.height
  ) {
    throw new Error(`Pexels attribution metadata changed for photo ${source.pexelsPhotoId}.`);
  }
  return photo;
}
async function download(photo: PexelsPhoto) {
  const url = new URL(photo.src.original);
  url.searchParams.set('auto', 'compress');
  url.searchParams.set('cs', 'tinysrgb');
  url.searchParams.set('w', '1600');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Pexels download returned ${response.status}.`);
  const mimeType = response.headers.get('content-type')?.split(';')[0] ?? '';
  const buffer = Buffer.from(await response.arrayBuffer());
  const error = validateImageFile({ mimeType, byteSize: buffer.byteLength, buffer });
  if (error) throw new Error(error);
  return { buffer, mimeType, checksum: createHash('sha256').update(buffer).digest('hex') };
}

async function main() {
  loadEnvironment();
  const options = args();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  const target = safeUrl(databaseUrl);
  const catalog = validateHdoorsCatalog(
    JSON.parse(await readFile(path.join(directory, 'catalog.json'), 'utf8')),
  );
  const sources = imageSourceSchema.parse(
    JSON.parse(await readFile(path.join(directory, 'image-sources.json'), 'utf8')),
  ).images;
  const publishable = catalog.products.filter(
    (product) => product.recordKey !== retainedDraftRecordKey,
  );
  const sourceCounts = new Map<string, number>();
  for (const source of sources)
    sourceCounts.set(source.recordKey, (sourceCounts.get(source.recordKey) ?? 0) + 1);
  if (
    publishable.some((product) => sourceCounts.get(product.recordKey) !== 3) ||
    sourceCounts.size !== 29
  )
    throw new Error('Every active product must have exactly three manifest images.');
  const db = drizzleHttp(neon(databaseUrl), { schema });
  const skus = catalog.products.map((product) => product.sku);
  const variantSkus = catalog.products.map((product) => product.variant.sku);
  const [products, variants, existingMedia] = await Promise.all([
    db.select().from(schema.products).where(inArray(schema.products.sku, skus)),
    db
      .select()
      .from(schema.productVariants)
      .where(inArray(schema.productVariants.sku, variantSkus)),
    db
      .select()
      .from(schema.mediaAssets)
      .where(inArray(schema.mediaAssets.legacyObjectKey, sources.map(objectKey))),
  ]);
  if (products.length !== 30 || variants.length !== 30)
    throw new Error('The complete 30-product import must exist before publication.');
  console.log(
    JSON.stringify(
      {
        target: `${target.hostname}/${target.pathname.slice(1)}`,
        mode: options.apply ? 'APPLY' : 'DRY RUN',
        activeProducts: 29,
        draftProducts: 1,
        imagesAlreadyImported: existingMedia.length,
        imagesToImport: 87 - existingMedia.length,
      },
      null,
      2,
    ),
  );
  if (!options.apply) return;
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) throw new Error('PEXELS_API_KEY is required server-side.');
  const productBySku = new Map(products.map((product) => [product.sku, product]));
  const existingKeys = new Set(existingMedia.map((media) => media.legacyObjectKey));
  for (const source of sources) {
    if (existingKeys.has(objectKey(source))) continue;
    const item = publishable.find((product) => product.recordKey === source.recordKey);
    if (!item) throw new Error(`Missing product ${source.recordKey}.`);
    const databaseProduct = productBySku.get(item.sku);
    if (!databaseProduct) throw new Error(`Missing DB product ${item.sku}.`);
    let remote = await getCloudinaryImageProvider(fullPublicId(source));
    let downloaded: Awaited<ReturnType<typeof download>> | null = null;
    if (!remote) {
      const photo = await fetchPhoto(source, apiKey);
      downloaded = await download(photo);
      remote = await uploadImageToCloudinaryProvider(
        downloaded.buffer,
        barePublicId(source),
        'product',
      );
    }
    await db.insert(schema.mediaAssets).values({
      id: uuidv7(),
      legacyObjectKey: objectKey(source),
      secureUrl: remote.secure_url,
      cloudinaryPublicId: remote.public_id,
      mimeType: downloaded?.mimeType ?? `image/${remote.format ?? 'jpeg'}`,
      byteSize: downloaded?.buffer.byteLength ?? Number(remote.bytes ?? 0),
      width: remote.width,
      height: remote.height,
      checksum: downloaded?.checksum ?? null,
      uploadStatus: 'READY',
      role: source.slot === 0 ? 'PRIMARY' : 'GALLERY',
      sortOrder: source.slot,
      isPrimary: source.slot === 0,
      purpose: 'product',
      altTranslations: {
        hy: `Պատկերազարդ լուսանկար (ոչ ճշգրիտ մոդել) — ${item.translations.hy.title}`,
        en: `Illustrative photo (not the exact model) — ${item.translations.en.title}`,
        ru: `Иллюстративная фотография (не точная модель) — ${item.translations.ru.title}`,
      },
      sourceMetadata: {
        kind: 'ILLUSTRATIVE_PEXELS',
        sourceUrl: source.photoPageUrl,
        sourcePageUrl: item.source.imagePageUrl,
        photographer: source.photographer,
        photographerUrl: source.photographerUrl,
        permissionStatus: 'LICENSED',
        permissionBasis: 'Pexels License and API attribution requirements',
        retrievedAt: '2026-11-09',
        exactMatch: false,
      },
      productId: databaseProduct.id,
    });
    console.log(`Imported media ${source.recordKey} ${source.slot + 1}/3.`);
  }

  const existingHeroes = await db.select({ id: schema.heroSlides.id }).from(schema.heroSlides);
  if (existingHeroes.length === 0) {
    const heroCopy = [
      {
        hy: [
          'Hdoors դռների ցուցադրական կատալոգ',
          'Ընտրեք աղբյուրով հաստատված 29 մոդելներից։',
          'Դիտել կատալոգը',
        ],
        en: [
          'Hdoors demonstration catalog',
          'Explore 29 source-backed door models.',
          'Browse catalog',
        ],
        ru: [
          'Демонстрационный каталог Hdoors',
          'Выберите из 29 моделей с указанными источниками.',
          'Смотреть каталог',
        ],
      },
      {
        hy: [
          'Միջսենյակային դռներ',
          'Փեղկեր, հարդարումներ և ապակեպատ լուծումներ։',
          'Ընտրել միջսենյակային',
        ],
        en: ['Interior doors', 'Door leaves, finishes and glazed designs.', 'Shop interior'],
        ru: [
          'Межкомнатные двери',
          'Полотна, покрытия и остеклённые решения.',
          'Выбрать межкомнатные',
        ],
      },
      {
        hy: ['Մուտքի դռներ', 'Բնակարանի մուտքի աղբյուրով նկարագրված մոդելներ։', 'Ընտրել մուտքի'],
        en: ['Entrance doors', 'Source-documented apartment entrance models.', 'Shop entrance'],
        ru: ['Входные двери', 'Модели для квартиры с указанными источниками.', 'Выбрать входные'],
      },
    ];
    for (let index = 0; index < heroCopy.length; index += 1) {
      const source = sources[index]!;
      const publicId = `hdoors-home-hero-${index}-pexels-${source.pexelsPhotoId}`;
      const fullId = `door/hero/${publicId}`;
      let remote = await getCloudinaryImageProvider(fullId);
      let downloaded: Awaited<ReturnType<typeof download>> | null = null;
      if (!remote) {
        const photo = await fetchPhoto(source, apiKey);
        downloaded = await download(photo);
        remote = await uploadImageToCloudinaryProvider(downloaded.buffer, publicId, 'hero');
      }
      const id = uuidv7();
      const copy = heroCopy[index]!;
      await db.insert(schema.heroSlides).values({
        id,
        sortOrder: index + 1,
        isActive: true,
        translations: {
          hy: {
            title: copy.hy[0]!,
            subtitle: copy.hy[1]!,
            buttonLabel: copy.hy[2]!,
            buttonUrl:
              index === 0
                ? '/hy/products'
                : `/hy/products?category=${index === 1 ? 'mijsenyakayin-drner' : 'mutqi-drner'}`,
          },
          en: {
            title: copy.en[0]!,
            subtitle: copy.en[1]!,
            buttonLabel: copy.en[2]!,
            buttonUrl:
              index === 0
                ? '/en/products'
                : `/en/products?category=${index === 1 ? 'interior-doors' : 'entrance-doors'}`,
          },
          ru: {
            title: copy.ru[0]!,
            subtitle: copy.ru[1]!,
            buttonLabel: copy.ru[2]!,
            buttonUrl:
              index === 0
                ? '/ru/products'
                : `/ru/products?category=${index === 1 ? 'mezhkomnatnye-dveri' : 'vhodnye-dveri'}`,
          },
        },
      });
      await db
        .insert(schema.mediaAssets)
        .values({
          id: uuidv7(),
          legacyObjectKey: `pexels:${source.pexelsPhotoId}:home-hero:${index}`,
          secureUrl: remote.secure_url,
          cloudinaryPublicId: remote.public_id,
          mimeType: downloaded?.mimeType ?? `image/${remote.format ?? 'jpeg'}`,
          byteSize: downloaded?.buffer.byteLength ?? Number(remote.bytes ?? 0),
          width: remote.width,
          height: remote.height,
          checksum: downloaded?.checksum ?? null,
          uploadStatus: 'READY',
          role: 'HERO_DESKTOP',
          sortOrder: 0,
          isPrimary: false,
          purpose: 'hero',
          altTranslations: {
            hy: 'Hdoors գլխավոր բաժնի պատկերազարդ լուսանկար',
            en: 'Illustrative Hdoors homepage photograph',
            ru: 'Иллюстративная фотография главной страницы Hdoors',
          },
          sourceMetadata: {
            kind: 'ILLUSTRATIVE_PEXELS',
            sourceUrl: source.photoPageUrl,
            photographer: source.photographer,
            photographerUrl: source.photographerUrl,
            permissionStatus: 'LICENSED',
            permissionBasis: 'Pexels License and API attribution requirements',
            retrievedAt: '2026-11-09',
            exactMatch: false,
          },
          heroSlideId: id,
        });
    }
  }

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: databaseUrl });
  const txDb = drizzleWebSocket({ client: pool, schema });
  try {
    await txDb.transaction(async (tx) => {
      const freshProducts = await tx
        .select()
        .from(schema.products)
        .where(inArray(schema.products.sku, skus));
      const freshVariants = await tx
        .select()
        .from(schema.productVariants)
        .where(inArray(schema.productVariants.sku, variantSkus));
      const productMap = new Map(freshProducts.map((row) => [row.sku, row]));
      const variantMap = new Map(freshVariants.map((row) => [row.sku, row]));
      for (const item of catalog.products) {
        const p = productMap.get(item.sku);
        const v = variantMap.get(item.variant.sku);
        if (!p || !v) throw new Error(`Incomplete identity ${item.recordKey}.`);
        const isDraft = item.recordKey === retainedDraftRecordKey;
        const price = isDraft ? null : item.source.observedPrice;
        const stock = price ? developmentStock : 0;
        if (v.stockOnHand !== stock)
          await tx
            .insert(schema.stockMovements)
            .values({
              id: uuidv7(),
              productId: p.id,
              variantId: v.id,
              delta: stock - v.stockOnHand,
              reason: 'IMPORT',
              resultingBalance: stock,
              correlationId: `hdoors-development-catalog:${item.recordKey}`,
            });
        await tx
          .update(schema.productVariants)
          .set({
            status: price ? 'ACTIVE' : 'INQUIRY',
            priceAmount: price?.amount ?? null,
            compareAtAmount: price?.regularAmount ?? null,
            stockOnHand: stock,
            updatedAt: new Date(),
          })
          .where(eq(schema.productVariants.id, v.id));
        await tx
          .update(schema.products)
          .set({
            status: isDraft ? 'DRAFT' : 'ACTIVE',
            priceAmount: price?.amount ?? 0,
            compareAtAmount: price?.regularAmount ?? null,
            stockOnHand: stock,
            isFeatured: !isDraft && catalog.products.indexOf(item) < 8,
            updatedAt: new Date(),
          })
          .where(eq(schema.products.id, p.id));
      }
      const upsert = async (key: string, value: Record<string, unknown>) =>
        tx
          .insert(schema.storeSettings)
          .values({ key, value, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: schema.storeSettings.key,
            set: { value, updatedAt: new Date() },
          });
      await upsert('store.catalogDemo', {
        enabled: true,
        messages: {
          hy: 'Ցուցադրական կատալոգ․ գները և առկայությունը ենթակա են հաստատման։ Որոշ պատկերներ պատկերազարդ լուսանկարներ են։',
          en: 'Demonstration catalog: prices and availability require confirmation. Some images are illustrative photography.',
          ru: 'Демонстрационный каталог: цены и наличие требуют подтверждения. Некоторые изображения являются иллюстративными.',
        },
        pexelsAttribution: {
          labels: {
            hy: 'Լուսանկարները՝ Pexels-ից',
            en: 'Photos provided by Pexels',
            ru: 'Фотографии предоставлены Pexels',
          },
          url: 'https://www.pexels.com/',
        },
      });
      await upsert('store.homepage', homepageSetting());
    });
  } finally {
    await pool.end();
  }
  console.log('[APPLY COMPLETE] 29 active products, 1 draft, 87 attributed product images.');
}

function homepageSetting(): Record<string, unknown> {
  const l = (hy: string, en: string, ru: string) => ({ hy, en, ru });
  const benefitTitles = [
    l('Աղբյուրների հղումներ', 'Traceable sources', 'Ссылки на источники'),
    l('Եռալեզու կատալոգ', 'Three-language catalog', 'Каталог на трёх языках'),
    l('Ճշգրիտ չափումներ', 'Documented dimensions', 'Документированные размеры'),
    l('Հաստատման ենթակա գներ', 'Prices require confirmation', 'Цены требуют подтверждения'),
    l('Ապահով վճարում', 'Safe checkout', 'Безопасное оформление'),
    l('Առաքման խորհրդատվություն', 'Delivery guidance', 'Консультация по доставке'),
    l('Տեղադրման խորհրդատվություն', 'Installation guidance', 'Консультация по монтажу'),
    l('Թափանցիկ կոմպլեկտացիա', 'Clear package basis', 'Прозрачная комплектация'),
    l('Արտադրողի նշում', 'Manufacturer identity', 'Бренд производителя'),
    l('Տվյալների ստուգում', 'Release verification', 'Проверка перед выпуском'),
  ];
  return {
    featuredTitle: l('Առաջարկվող դռներ', 'Featured doors', 'Рекомендуемые двери'),
    viewAllLabel: l('Դիտել բոլորը', 'View all', 'Смотреть все'),
    emptyFeaturedLabel: l('Ապրանքներ չկան', 'No products yet', 'Товаров пока нет'),
    categoriesTitle: l('Ընտրել ըստ բաժնի', 'Shop by category', 'Выбрать по категории'),
    brandsTitle: l('Ներկայացված ապրանքանիշեր', 'Brands represented', 'Представленные бренды'),
    about: {
      eyebrow: l('Hdoors', 'Hdoors', 'Hdoors'),
      title: l(
        'Դռներ՝ ստուգելի աղբյուրներով',
        'Doors with traceable sources',
        'Двери с проверяемыми источниками',
      ),
      description: l(
        'Ցուցադրական կատալոգը միավորում է արտադրողների և տեղական վաճառողների փաստագրված առաջարկները։',
        'This demonstration catalog brings together documented manufacturer and local retailer listings.',
        'Демонстрационный каталог объединяет документированные предложения производителей и местных продавцов.',
      ),
      ctaLabel: l('Մեր մասին', 'About us', 'О нас'),
    },
    benefits: benefitTitles.map((title) => ({
      title,
      description: l(
        'Մանրամասները հիմնված են հրապարակված և փաստագրված տվյալների վրա։',
        'Details are based on published, documented data.',
        'Детали основаны на опубликованных документированных данных.',
      ),
    })),
    brands: [
      'ВДК',
      'Покрова',
      'OPPA',
      'Zadoor',
      'Jaway',
      'ProfilDoors',
      'Дифорд',
      'Belwooddoors',
      'Unidoors',
      'Velldoris',
    ],
    footerLinks: [
      { label: l('Ապրանքներ', 'Products', 'Товары'), href: '/products' },
      { label: l('Բլոգ', 'Blog', 'Блог'), href: '/blog' },
      { label: l('Մեր մասին', 'About', 'О нас'), href: '/about' },
      { label: l('Կապ', 'Contact', 'Контакты'), href: '/contact' },
      { label: l('Գաղտնիություն', 'Privacy', 'Конфиденциальность'), href: '/legal/privacy' },
      { label: l('Պայմաններ', 'Terms', 'Условия'), href: '/legal/terms' },
    ],
  };
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
