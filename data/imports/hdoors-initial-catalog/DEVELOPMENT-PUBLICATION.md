# Hdoors development catalog reset and publication

## Isolated database and recovery point

- Development branch: `dev-catalog-reset` (`br-steep-waterfall-bdgj2e2v`), created `2026-11-09T09:31:30Z` from `production`.
- Parent/backup branch: `production` (`br-holy-water-bdlhzknp`). It was only read for the Cloudinary reference comparison and was not modified.
- Development endpoint: `ep-ancient-poetry-bdwveofc…/neondb`; production endpoint: `ep-rapid-breeze-bdsqy769…/neondb`.
- The Neon production branch is the owner-approved full recovery point. No separate local dump contains secrets or customer data.

## Reset scope

The isolated branch was cleared of catalog, media rows, categories, variants, inventory movements, hero/blog/contact content, promotions/delivery content, wishlists, carts, orders, order events/items, and payments. Schema, Drizzle migration history, three auth/admin users, roles, and general store configuration were retained. `store.catalogDemo` and `store.homepage` were recreated from the clean importer.

The initial Cloudinary comparison found 65 development references, all also referenced by production. They were preserved to avoid breaking production; zero remote assets were eligible for deletion. New assets use deterministic `door/product/hdoors-*` or `door/hero/hdoors-*` identifiers.

## Publication policy and resulting state

- Catalog: 30 source-tracked products, 29 `ACTIVE`, one `DRAFT`.
- Retained draft: `belwooddoors-event-1-graphite-900`. Its Domus URL states 44 mm while the page heading reports 38 mm, making it the most material unresolved configuration conflict.
- Linen: `diford-linen-line-graphite-oak-600` is `ACTIVE`. The source calls the model `Лайн`/Lain; the owner-approved Linen label and this spelling conflict are recorded without changing the sourced configuration.
- Taxonomy: 10 DB categories and 9 manufacturer brands represented by products; the DB-managed homepage lists 10 real brands, including Velldoris from the reviewed Nor Tun catalog.
- Prices: only exact observed AMD listing/configuration prices are applied. Leaf-only prices remain leaf-only through the variant item type. Products without an exact amount are `INQUIRY`.
- Inventory: 19 priced variants have three synthetic development units each, recorded through an `IMPORT` stock movement. This is not verified Hdoors or supplier stock.
- Payments: no payment configuration was changed. No external transaction was performed.

## Media and permissions

No reviewed individual product page provided sufficiently explicit reuse authorization for exact-model photography. Therefore no product-page image was copied. Each of the 29 visible products has three Pexels illustrative images (87 product media rows total), plus three attributed Pexels hero images. Every Pexels row stores the photographer, source page, retrieval date, permission basis, and `exactMatch: false`; localized alt text states that the image is illustrative and not the exact model.

Images are retrieved server-side through the official Pexels API, validated, imported to Cloudinary, and served from Cloudinary rather than hotlinked. Aspect ratios are preserved and every visible product has exactly one primary image.

See `image-sources.json` for image-level attribution and `development-publication-summary.csv` for per-product exact/Pexels/missing counts.

## DB-driven homepage

`store.homepage` now supplies the localized featured/category/brand/about/benefit/footer-link copy. Ten benefits, ten categories, ten homepage brand labels, and localized footer links are stored in the database. Three active hero slides and their media are database records. Featured product cards, category links, prices, availability, and images are read from catalog tables. The site-level trilingual demo notice is in `store.catalogDemo`.

## Release gate

Before any production release, replace or explicitly confirm all demonstration prices, synthetic stock, illustrative media, Linen spelling normalization, and remaining inquiry fields. Do not copy this branch’s database URLs or demo records to production automatically.
