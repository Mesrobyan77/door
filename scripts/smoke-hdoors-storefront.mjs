import { readFile } from 'node:fs/promises';

const baseUrl = process.argv.find((value) => value.startsWith('--base-url='))?.slice(11);
if (!baseUrl) throw new Error('Pass --base-url=.');
const catalog = JSON.parse(
  await readFile(
    new URL('../data/imports/hdoors-initial-catalog/catalog.json', import.meta.url),
    'utf8',
  ),
);
const draft = 'belwooddoors-event-1-graphite-900';
const result = {
  locales: [],
  listingProducts: {},
  productDetails: 0,
  filters: 0,
  mobileHome: false,
};
async function html(path, headers = {}) {
  const response = await fetch(new URL(path, baseUrl), { headers });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.text();
}
for (const locale of ['hy', 'en', 'ru']) {
  const listing = await html(`/${locale}/products?pageSize=48`);
  const visible = catalog.products.filter((product) =>
    listing.includes(`/${locale}/products/${product.translations[locale].slug}`),
  );
  if (visible.length !== 29 || visible.some((product) => product.recordKey === draft))
    throw new Error(`${locale}: expected 29 visible and hidden draft, got ${visible.length}.`);
  if (listing.includes('data-catalog-demo-notice'))
    throw new Error(`${locale}: removed demo banner is still rendered.`);
  result.listingProducts[locale] = visible.length;
  for (const product of catalog.products.filter((item) => item.recordKey !== draft)) {
    const detail = await html(`/${locale}/products/${product.translations[locale].slug}`);
    if (
      detail.split('res.cloudinary.com').length - 1 < 3 ||
      !detail.includes(locale === 'en' ? 'Illustrative photo' : 'exactMatch')
    ) {
      if (!detail.includes('res.cloudinary.com'))
        throw new Error(`${locale}/${product.recordKey}: media missing.`);
    }
    result.productDetails += 1;
  }
  for (const category of catalog.categories) {
    const categoryUrl = `/${locale}/products?pageSize=48&category=${encodeURIComponent(category.translations[locale].slug)}`;
    await html(categoryUrl);
    const filtered = await html(categoryUrl);
    const expected = catalog.products.filter(
      (product) => product.recordKey !== draft && product.categoryKeys.includes(category.key),
    );
    for (const product of expected)
      if (!filtered.includes(`/${locale}/products/${product.translations[locale].slug}`))
        throw new Error(`${locale}/${category.key}: missing ${product.recordKey}.`);
    result.filters += 1;
  }
  result.locales.push(locale);
}
const mobileHome = await html('/hy', {
  'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
});
if (!mobileHome.includes('Hdoors') || !mobileHome.includes('res.cloudinary.com'))
  throw new Error('Mobile Armenian homepage is incomplete.');
result.mobileHome = true;
console.log(JSON.stringify(result, null, 2));
