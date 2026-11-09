import { readFileSync } from 'node:fs';
import path from 'node:path';

import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { parse } from 'dotenv';
import ws from 'ws';

import { deleteCloudinaryImageProvider } from '@/lib/media/cloudinary-provider';

const expectedDevelopmentHost = 'ep-ancient-poetry-bdwveofc';
const expectedProductionHost = 'ep-rapid-breeze-bdsqy769';

function environment(file: string): Record<string, string> {
  return parse(readFileSync(path.resolve(process.cwd(), file)));
}

async function main() {
  const apply = process.argv.includes('--apply');
  const production = environment('.env');
  const development = environment('.env.local');
  const productionUrl = new URL(production.DATABASE_URL ?? '');
  const developmentUrl = new URL(
    development.DATABASE_URL_UNPOOLED ?? development.DATABASE_URL ?? '',
  );
  if (
    !productionUrl.hostname.startsWith(expectedProductionHost) ||
    !developmentUrl.hostname.startsWith(expectedDevelopmentHost) ||
    developmentUrl.hostname === productionUrl.hostname ||
    development.DATABASE_ENVIRONMENT !== 'development'
  ) {
    throw new Error('Database safety assertion failed; refusing reset.');
  }
  for (const [key, value] of Object.entries({ ...production, ...development }))
    if (key.startsWith('CLOUDINARY_') || key === 'PEXELS_API_KEY') process.env[key] = value;
  console.log(
    JSON.stringify(
      {
        mode: apply ? 'APPLY' : 'DRY RUN',
        development: { host: developmentUrl.hostname, db: developmentUrl.pathname.slice(1) },
        productionBackup: { host: productionUrl.hostname, db: productionUrl.pathname.slice(1) },
      },
      null,
      2,
    ),
  );

  const prodSql = neon(production.DATABASE_URL!);
  const devSql = neon(development.DATABASE_URL!);
  const [prodMedia, devMedia, counts] = await Promise.all([
    prodSql.query(
      'select cloudinary_public_id from media_assets where cloudinary_public_id is not null',
      [],
    ),
    devSql.query(
      'select cloudinary_public_id from media_assets where cloudinary_public_id is not null',
      [],
    ),
    devSql.query(
      `select (select count(*) from products)::int products, (select count(*) from media_assets)::int media, (select count(*) from orders)::int orders, (select count(*) from carts)::int carts, (select count(*) from users)::int preserved_users`,
      [],
    ),
  ]);
  const productionIds = new Set(prodMedia.map((row) => String(row.cloudinary_public_id)));
  const exclusive = devMedia
    .map((row) => String(row.cloudinary_public_id))
    .filter((id) => id.startsWith('door/') && !productionIds.has(id));
  console.log(
    JSON.stringify(
      {
        before: counts[0],
        cloudinary: {
          sharedPreserved: devMedia.length - exclusive.length,
          developmentExclusiveToDelete: exclusive.length,
        },
      },
      null,
      2,
    ),
  );
  if (!apply) return;
  for (const publicId of exclusive) await deleteCloudinaryImageProvider(publicId);

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({
    connectionString: development.DATABASE_URL_UNPOOLED ?? development.DATABASE_URL,
  });
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`truncate table
      payments, order_events, order_items, promotion_users, cart_items, wishlist_items,
      stock_movements, media_assets, product_categories, reviews, carts, orders,
      promotions, delivery_rules, hero_slides, blog_posts, contact_messages, outbox_events,
      product_variants, products, categories`);
    await client.query(
      `delete from store_settings where key in ('store.catalogDemo', 'store.homepage')`,
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
  const [after] = await devSql.query(
    `select (select count(*) from products)::int products, (select count(*) from media_assets)::int media, (select count(*) from orders)::int orders, (select count(*) from carts)::int carts, (select count(*) from users)::int preserved_users`,
    [],
  );
  if (
    !after ||
    Number(after.products) !== 0 ||
    Number(after.media) !== 0 ||
    Number(after.orders) !== 0 ||
    Number(after.carts) !== 0 ||
    Number(after.preserved_users) !== Number(counts[0]?.preserved_users)
  )
    throw new Error('Reset postcondition failed.');
  console.log(JSON.stringify({ after, deletedCloudinaryAssets: exclusive.length }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
