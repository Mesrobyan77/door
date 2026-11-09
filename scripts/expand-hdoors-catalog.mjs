import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../data/imports/hdoors-initial-catalog/catalog.json', import.meta.url);
const catalog = JSON.parse(await readFile(file, 'utf8'));
const t = (hy, en, ru, slug) => ({
  hy: {
    title: hy,
    slug: `${slug}-hy`,
    description: `${hy}՝ աղբյուրով հաստատված Hdoors ցուցադրական կատալոգի բաժին։`,
  },
  en: {
    title: en,
    slug,
    description: `Source-backed ${en.toLowerCase()} in the Hdoors demonstration catalog.`,
  },
  ru: {
    title: ru,
    slug: `${slug}-ru`,
    description: `${ru}: раздел демонстрационного каталога Hdoors с указанием источников.`,
  },
});
catalog.categories = [
  {
    key: 'interior',
    sortOrder: 1,
    translations: catalog.categories.find((x) => x.key === 'interior').translations,
  },
  {
    key: 'entrance',
    sortOrder: 2,
    translations: catalog.categories.find((x) => x.key === 'entrance').translations,
  },
  {
    key: 'glazed',
    sortOrder: 3,
    translations: t('Ապակեպատ դռներ', 'Glazed doors', 'Остеклённые двери', 'glazed-doors'),
  },
  {
    key: 'solid',
    sortOrder: 4,
    translations: t('Խուլ դռներ', 'Solid doors', 'Глухие двери', 'solid-doors'),
  },
  {
    key: 'leaf-only',
    sortOrder: 5,
    translations: t('Միայն դռան փեղկ', 'Door leaves', 'Дверные полотна', 'door-leaves'),
  },
  {
    key: 'apartment',
    sortOrder: 6,
    translations: t(
      'Բնակարանի մուտքի դռներ',
      'Apartment entrance doors',
      'Входные двери для квартиры',
      'apartment-entrance-doors',
    ),
  },
  {
    key: 'pvc',
    sortOrder: 7,
    translations: t('ՊՎՔ ծածկույթ', 'PVC finish', 'Покрытие ПВХ', 'pvc-finish'),
  },
  {
    key: 'veneer',
    sortOrder: 8,
    translations: t('Շպոնապատ դռներ', 'Veneered doors', 'Шпонированные двери', 'veneered-doors'),
  },
  {
    key: 'enamel',
    sortOrder: 9,
    translations: t('Էմալապատ դռներ', 'Enamel doors', 'Эмалированные двери', 'enamel-doors'),
  },
  {
    key: 'modern',
    sortOrder: 10,
    translations: t('Ժամանակակից դռներ', 'Modern doors', 'Современные двери', 'modern-doors'),
  },
];

for (const product of catalog.products) {
  const keys = [product.categoryKey];
  if (product.hasGlazing === true) keys.push('glazed');
  else if (product.hasGlazing === false) keys.push('solid');
  if (product.variant.itemType === 'LEAF_ONLY') keys.push('leaf-only');
  if (product.classification === 'ENTRANCE') keys.push('apartment');
  const surface = (product.surfaceCoating ?? '').toLowerCase();
  if (surface.includes('pvc')) keys.push('pvc');
  if (surface.includes('veneer')) keys.push('veneer');
  if (surface.includes('enamel')) keys.push('enamel');
  keys.push('modern');
  product.categoryKeys = [...new Set(keys)];
}

const components = [
  { code: 'FRAME', status: 'EXCLUDED' },
  { code: 'ARCHITRAVE', status: 'EXCLUDED' },
];
function product({
  key,
  sku,
  brand,
  model,
  title,
  url,
  id,
  width = null,
  height = null,
  thickness = null,
  color = null,
  finish = null,
  glazing = null,
  glass = null,
  price = null,
  regular = null,
  collection = null,
  manufacturer = null,
  country = null,
  conflicts = [],
  note = 'Individual product or official model page.',
}) {
  const slug = key;
  const source = url.includes('domus.am')
    ? ['domus', 'Domus Armenia']
    : url.includes('nortun.am')
      ? ['nortun', 'Nor Tun Armenia']
      : ['profildoors', 'ProfilDoors official'];
  const categoryKeys = ['interior', glazing ? 'glazed' : 'solid', width ? 'leaf-only' : 'modern'];
  if ((finish ?? '').toLowerCase().includes('pvc')) categoryKeys.push('pvc');
  if ((finish ?? '').toLowerCase().includes('veneer')) categoryKeys.push('veneer');
  if ((finish ?? '').toLowerCase().includes('enamel')) categoryKeys.push('enamel');
  if (!categoryKeys.includes('modern')) categoryKeys.push('modern');
  const dimensions =
    width && height
      ? `${width}×${height}${thickness ? `×${thickness}` : ''} mm`
      : 'configuration shown on the official model page';
  return {
    recordKey: key,
    sku,
    categoryKey: 'interior',
    categoryKeys: [...new Set(categoryKeys)],
    classification: 'INTERIOR',
    brand,
    model,
    collection,
    manufacturer,
    countryOfManufacture: country,
    structuralMaterial: null,
    coreMaterial: null,
    surfaceCoating: finish,
    hasGlazing: glazing,
    glazingType: glass,
    entranceEnvironments: null,
    translations: {
      hy: {
        title,
        slug: `${slug}-hy`,
        description: `${title}. ${dimensions}։ Չհաստատված բնութագրերը չեն ցուցադրվում։`,
      },
      en: {
        title,
        slug,
        description: `${title}. ${dimensions}. Unverified specifications are omitted.`,
      },
      ru: {
        title,
        slug: `${slug}-ru`,
        description: `${title}. ${dimensions}. Неподтверждённые характеристики не указаны.`,
      },
    },
    source: {
      sourceKey: source[0],
      retailerOrManufacturer: source[1],
      url,
      retrievedAt: '2026-11-09',
      originalId: id,
      observedPrice:
        price == null
          ? null
          : {
              amount: price,
              currency: 'AMD',
              basis: 'LEAF_ONLY',
              promotional: regular != null,
              regularAmount: regular,
            },
      evidence: [
        {
          fields: [
            'model',
            ...(width ? ['dimensions'] : []),
            ...(finish ? ['finish'] : []),
            ...(price ? ['price'] : []),
          ],
          sourceUrl: url,
          sourceNote: note,
        },
      ],
      imagePageUrl: url,
      imageUrl: null,
      reusePermission: 'UNKNOWN',
    },
    unknownFields: [
      'opening mechanism',
      'handing',
      'warranty',
      ...(width ? [] : ['exact dimensions']),
    ],
    conflicts,
    generatedFields: ['internal SKU', 'localized slugs', 'hy/en/ru descriptions'],
    variant: {
      sku: `${sku}-V1`,
      configurationKey: `${slug}-configuration`,
      itemType: width ? 'LEAF_ONLY' : 'LEGACY',
      status: 'INQUIRY',
      sourceConfiguration: dimensions,
      leafWidthMm: width,
      leafHeightMm: height,
      leafThicknessMm: thickness,
      unitWidthMm: null,
      unitHeightMm: null,
      frameDepthMm: null,
      colorName: color,
      finishName: finish,
      handing: null,
      swing: null,
      includedComponents: width ? components : [],
    },
  };
}

const extras = [
  product({
    key: 'diford-linen-line-graphite-oak-600',
    sku: 'HD-INT-DIF-LINEN-600',
    brand: 'Дифорд',
    model: 'Лайн (Line / Linen)',
    title: 'Diford Linen / Лайн, graphite and old oak',
    url: 'https://domus.am/en/product/lain-door-dg-600x2000mm-graphite-softoak-old-pvc',
    id: 'ER-00081330',
    width: 600,
    height: 2000,
    color: 'Graphite soft / old oak',
    finish: 'PVC',
    glazing: false,
    price: 42000,
    conflicts: [
      'The source transliterates the model as Lain/Line; Linen is retained as the owner-approved catalog label.',
    ],
  }),
  product({
    key: 'vdk-eko-9m-white-ash-900',
    sku: 'HD-INT-VDK-EKO9M-900',
    brand: 'ВДК',
    model: 'EKO 9 M',
    title: 'VDK EKO 9 M, white ash with black glass',
    url: 'https://domus.am/product/eko-simple-9-m-door-leaf-do-900x2000mm-white-ash',
    id: 'ER-00071896',
    width: 900,
    height: 2000,
    color: 'White ash',
    finish: 'PVC',
    glazing: true,
    glass: 'Black glass',
    price: 27970,
    regular: 32900,
  }),
  product({
    key: 'diford-skin-2-white-600',
    sku: 'HD-INT-DIF-SKIN2-600',
    brand: 'Дифорд',
    model: 'Skin-2',
    title: 'Diford Skin-2, white shagreen',
    url: 'https://domus.am/product/skin-2-door-flap-dg-600x2000mm-white-shagren-pvc',
    id: 'ER-00074292',
    width: 600,
    height: 2000,
    color: 'White shagreen',
    finish: 'PVC',
    glazing: false,
    price: 26780,
    regular: 31500,
  }),
  product({
    key: 'belwooddoors-event-1-graphite-900',
    sku: 'HD-INT-BWD-EVENT1-900',
    brand: 'Belwooddoors',
    model: 'Event 1',
    title: 'Belwooddoors Event 1, graphite enamel',
    url: 'https://domus.am/product/event-1-door-leaf-dg-900x2000x44mm-enamel-graphite',
    id: 'RE-00088914',
    width: 900,
    height: 2000,
    thickness: 38,
    color: 'Graphite',
    finish: 'Enamel',
    glazing: false,
    price: 120800,
    conflicts: [
      'Source URL says 44 mm while the product heading reports 38 mm; retained as the sole draft.',
    ],
  }),
  product({
    key: 'belwooddoors-mirella-urban-light-900',
    sku: 'HD-INT-BWD-MIRELLA-900',
    brand: 'Belwooddoors',
    model: 'Mirella',
    title: 'Belwooddoors Mirella, Urban Light',
    url: 'https://domus.am/en/product/mirella-door-leaf-dg-900x2000x38mm-urban-light-po',
    id: 'ER-00069728',
    width: 900,
    height: 2000,
    thickness: 38,
    color: 'Urban Light',
    finish: 'Polypropylene',
    glazing: false,
    price: 33000,
    regular: 56000,
  }),
  product({
    key: 'belwooddoors-cremona-1-graphite-600',
    sku: 'HD-INT-BWD-CREM1-600',
    brand: 'Belwooddoors',
    model: 'Cremona 1',
    title: 'Belwooddoors Cremona 1, graphite enamel',
    url: 'https://domus.am/en/product/cremona-1-door-leaf-dg-600x2000x38mm-enamel-graphi',
    id: 'ER-00067137',
    width: 600,
    height: 2000,
    thickness: 38,
    color: 'Graphite',
    finish: 'Enamel',
    glazing: false,
    price: 85000,
  }),
  product({
    key: 'unidoors-fm07-eco-bianco-800',
    sku: 'HD-INT-UNI-FM07-BIA-800',
    brand: 'Unidoors',
    model: 'FM07-ECO',
    title: 'Unidoors FM07-ECO, Bianco',
    url: 'https://nortun.am/catalog/doors/_unidoors_fm07_eco_byanko_07_2018/',
    id: '32805',
    width: 800,
    height: 2000,
    thickness: 40,
    color: 'Bianco',
    finish: 'PVC',
    glazing: false,
    price: 24800,
    manufacturer: 'Unidoors',
    country: 'Belarus',
  }),
  product({
    key: 'unidoors-fm07-eco-sonoma-800',
    sku: 'HD-INT-UNI-FM07-SON-800',
    brand: 'Unidoors',
    model: 'FM07-ECO',
    title: 'Unidoors FM07-ECO, Sonoma oak',
    url: 'https://www.nortun.am/catalog/doors/Interior_doors/_unidoors_fm07_eco_dub_sonoma_08_2018/',
    id: '32827',
    width: 800,
    height: 2000,
    thickness: 40,
    color: 'Sonoma oak',
    finish: 'PVC',
    glazing: false,
    price: 24800,
    manufacturer: 'Unidoors',
    country: 'Belarus',
  }),
  product({
    key: 'profildoors-1vt-h-bianche-notti',
    sku: 'HD-INT-PD-1VTH-BN',
    brand: 'ProfilDoors',
    model: '1VT-H',
    title: 'ProfilDoors 1VT-H, Bianche Notti veneer',
    url: 'https://profildoors.ru/catalog/seriya_vt/1vt/',
    id: '1VT-H',
    color: 'Bianche Notti 08C',
    finish: 'Natural veneer',
    glazing: null,
    collection: 'VT',
    manufacturer: 'ProfilDoors',
    country: 'Russia',
  }),
  product({
    key: 'profildoors-1ag-black-clear-glass',
    sku: 'HD-INT-PD-1AG-BLK',
    brand: 'ProfilDoors',
    model: '1AG',
    title: 'ProfilDoors 1AG, black profile and clear glass',
    url: 'https://profildoors.ru/catalog/seriya_ag/1_ag/',
    id: '1AG',
    thickness: 44,
    color: 'Black',
    finish: 'Aluminium profile',
    glazing: true,
    glass: 'Clear glass',
    collection: 'AG',
    manufacturer: 'ProfilDoors',
    country: 'Russia',
  }),
];
catalog.products = [
  ...catalog.products.filter((item) => !extras.some((extra) => extra.recordKey === item.recordKey)),
  ...extras,
];
catalog.retrievedAt = '2026-11-09';
await writeFile(file, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
