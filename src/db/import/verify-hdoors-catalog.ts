import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { config as loadEnv } from 'dotenv';

async function main() {
  loadEnv({ path: path.resolve(process.cwd(), '.env'), quiet: true });
  loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true, quiet: true });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  const target = new URL(databaseUrl);
  if (
    process.env.DATABASE_ENVIRONMENT !== 'development' ||
    !target.hostname.startsWith('ep-ancient-poetry-bdwveofc')
  )
    throw new Error('Unsafe verification target.');
  const sql = neon(databaseUrl);
  const [summary] = await sql.query(
    `select
    (select count(*)::int from products) products,
    (select count(*)::int from products where status='ACTIVE') active,
    (select count(*)::int from products where status='DRAFT') draft,
    (select count(*)::int from products where sku='HD-INT-BWD-EVENT1-900' and status='DRAFT') expected_draft,
    (select count(*)::int from products where sku='HD-INT-DIF-LINEN-600' and status='ACTIVE') linen_active,
    (select count(*)::int from categories) categories,
    (select count(*)::int from product_variants) variants,
    (select count(*)::int from media_assets where product_id is not null) product_media,
    (select count(*)::int from media_assets m join products p on p.id=m.product_id where p.status='ACTIVE' and m.source_metadata->>'kind'='ILLUSTRATIVE_PEXELS' and m.alt_translations ?& array['hy','en','ru']) attributed_product_media,
    (select count(*)::int from (select product_id from media_assets where product_id is not null group by product_id having count(*)=3 and count(*) filter (where is_primary)=1) x) products_with_three_images,
    (select count(*)::int from media_assets m join products p on p.id=m.product_id where p.status='DRAFT') draft_media,
    (select count(*)::int from hero_slides where is_active) heroes,
    (select count(*)::int from media_assets where hero_slide_id is not null and upload_status='READY') hero_media,
    (select count(*)::int from store_settings where key='store.homepage') homepage_settings,
    (select count(*)::int from store_settings where key='store.catalogDemo' and value->'messages' ?& array['hy','en','ru']) demo_notice,
    (select count(*)::int from stock_movements where correlation_id like 'hdoors-development-catalog:%') stock_movements,
    (select count(*)::int from product_variants where status='ACTIVE' and price_amount is not null and stock_on_hand=3) priced_demo_variants,
    (select count(*)::int from product_variants v join products p on p.id=v.product_id where p.status='ACTIVE' and v.status='INQUIRY' and v.price_amount is null and v.stock_on_hand=0) inquiry_variants,
    (select coalesce(sum(stock_on_hand),0)::int from product_variants) synthetic_stock_total,
    (select count(distinct brand_name)::int from products) product_brands,
    (select count(*)::int from users) users,
    (select count(*)::int from orders) orders,
    (select count(*)::int from carts) carts,
    (select count(*)::int from (select sku from products group by sku having count(*)>1 union all select sku from product_variants group by sku having count(*)>1) d) duplicate_skus`,
    [],
  );
  if (!summary) throw new Error('No verification result.');
  const expected = {
    products: 30,
    active: 29,
    draft: 1,
    expected_draft: 1,
    linen_active: 1,
    categories: 10,
    variants: 30,
    product_media: 87,
    attributed_product_media: 87,
    products_with_three_images: 29,
    draft_media: 0,
    heroes: 3,
    hero_media: 3,
    homepage_settings: 1,
    demo_notice: 1,
    priced_demo_variants: 19,
    inquiry_variants: 10,
    synthetic_stock_total: 57,
    product_brands: 9,
    users: 3,
    orders: 0,
    carts: 0,
    duplicate_skus: 0,
  };
  const failures = Object.entries(expected).flatMap(([key, value]) =>
    Number(summary[key]) === value ? [] : [`${key}: expected ${value}, got ${summary[key]}`],
  );
  console.log(
    JSON.stringify(
      { target: `${target.hostname}/${target.pathname.slice(1)}`, summary, failures },
      null,
      2,
    ),
  );
  if (failures.length) process.exitCode = 1;
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
