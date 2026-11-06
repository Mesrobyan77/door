# White Shop — progress

**Overall status.** The existing Phase 0–11 baseline remains; the approved door-variant slice is implemented and migrated on the confirmed test database. Whole-project/release readiness is not certified, and production deployment/migrations have not been performed.
**Last update.** 2026-11-06

## Milestones

| Phase | Name                          | Status         | Note                                                                                                                            |
| ----: | ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
|     0 | Approval                      | Done           | Kickoff defaults                                                                                                                |
|     1 | Foundation                    | Done           | Next.js, i18n, providers                                                                                                        |
|     2 | Database foundation           | Done           | 25-table baseline + seed; canonical model is now 26 tables; door-variant migrations applied only to the confirmed test database |
|     3 | Identity and authorization    | Done           | DB sessions, login/register/logout                                                                                              |
|     4 | Catalog admin and media       | Done (minimal) | Admin products/categories; Cloudinary upload endpoint with pending media finalization                                           |
|     5 | Storefront catalog            | Done (minimal) | List/detail/featured from DB                                                                                                    |
|     6 | Cart and checkout             | Done           | Durable cart + COD + coupon apply                                                                                               |
|     7 | Customer self-service         | Done (minimal) | Profile, orders, personal info                                                                                                  |
|     8 | Admin commerce operations     | Done           | Dashboard, orders ops, users, promotions                                                                                        |
|     9 | Content / analytics           | Done           | Hero, contact, blog, analytics, settings                                                                                        |
|    10 | Reviews / currency / payments | Done           | Reviews, FX cache, COD + webhook guards                                                                                         |
|    11 | Hardening / release           | Done (docs)    | Headers, legal stubs, release checklist                                                                                         |

## Approved door-variant slice

- `products` holds the shared door model/specifications; `product_variants` holds sellable configurations, SKU, price, stock and measurements.
- Admin editing, storefront selection, cart, checkout, stock movements, promotion targeting and order snapshots use variant identity.
- Migrations `0004_door_variants.sql` and `0005_motionless_mephisto.sql` are applied to the confirmed Neon `neondb` test/development database (PostgreSQL 18.6), not production. The journal contains six applied migrations through timestamp `1793960684825`; a subsequent `pnpm db:migrate` completed successfully without adding work.
- At migration time, the affected product, cart-item, order-item, stock-movement, promotion and media tables were verified empty. No existing product/order/cart records were backfilled, and the migration generated zero legacy variants. A restorable backup/isolated copy was unavailable; the verified empty state meant no existing rows were changed.
- Admins can upload, preview, assign, reorder, set primary and detach variant images through the existing authenticated Cloudinary pipeline. READY ownership is checked transactionally; storefront selection uses variant images and falls back to product images.
- Catalog price/availability filters use the same eligible variant. Cart and checkout use variant identity and authoritative price/stock; order snapshots retain the purchased SKU/configuration. Variant-targeted automatic promotions are supported.

### Door-variant verification (2026-11-06)

- Post-test DB state: 2 clearly identified test products, 3 variants (including one synthetic `LEGACY` variant), 3 active authenticated-cart lines, 3 order-item snapshots across two COD orders, 12 variant stock movements, 1 variant-targeted promotion, 2 READY variant media assets and 1 READY product-level fallback image. All checked cart/order/stock/media variant references resolve; required unique indexes and lookup indexes exist.
- Authenticated COD order `p100` purchased two distinct SKUs with different prices/configurations. Stock changed only for those variants; admin cancel → reopen → cancel restored the correct balances without changing either historical snapshot.
- Guest COD order `p101` was created with `user_id IS NULL`, then cancelled through the admin status action. Its SKU700 stock returned from 4 to 5 with one matching `CANCEL` movement. Customer/admin order views showed the stored configuration.
- Browser verification covered variant-specific Cloudinary upload/preview, variant image selection, product-image fallback, price/configuration/availability updates, combined in-stock price filters, separate cart lines and reload persistence. A synthetic legacy SKU also remained purchasable and persisted in the authenticated cart after reload.
- A 10% variant-targeted promotion for `E2E-LUMEN-900` displayed `135000 AMD` (from `150000 AMD`) in the storefront and cart; `E2E-LUMEN-700` remained undiscounted.
- An attempted sixth SKU700 cart unit was rejected server-side; DB quantity remained 5 against stock 5 and the UI showed an error. Real email/external notifications were not sent.
- Checks run for this continuation: `pnpm typecheck`, `pnpm lint`, `pnpm test` (118 tests / 35 files), `pnpm db:check`, `pnpm db:migrate`, `pnpm build` and `git diff --check` passed. `pnpm format:check` runs local Prettier 3.6.2 but fails on numerous unchanged repository files; changed task files are formatted individually.
- Remaining verification limits: a direct server-side attempt to add an unavailable/archived variant, a promotion-discounted COD order, and duplicate/concurrent checkout idempotency were not exercised. No pre-migration legacy records existed, so compatibility was checked with a synthetic `LEGACY` record rather than a migrated historical catalog.

### Door-store verification continuation — 2026-11-06

- Added `tests/integration/door-store-verification.test.ts`, `vitest.integration.config.ts`, and `pnpm test:integration`. The suite creates timestamped `VERIFY-DOOR-*` fixtures only; it does not alter pre-existing test records.
- Direct server-action checks passed against the confirmed Neon test/development database: archived and zero-stock variants were rejected by both `addToCart` and `createOrderAction`; rejected checkout retained the cart line, created no order, and did not change stock.
- A 10% variant-targeted automatic discount produced a COD order with `unitBaseAmount=135000`, item discount `30000` for quantity 2, `lineTotalAmount=270000`, order `subtotalAmount=270000`, `discountAmount=0` (coupon-only field), `totalAmount=270000`, the selected variant snapshot/SKU, and exactly the expected stock decrement.
- Concurrent duplicate submissions with one idempotency key created one order and one `ORDER` stock movement. Concurrent submissions with different keys for a single remaining unit created one order, one rejection, and left stock at zero; no oversell was observed.
- Direct persistence checks passed for variant gallery reorder, primary selection, detach, and survival of a separate product-level fallback asset. The code path is covered; a new authenticated browser interaction run for those exact three admin controls was not possible in this environment because no browser/E2E runner is configured. Earlier browser evidence remains limited to upload/preview, selection, and product-image fallback.
- Test-result clarification: `pnpm test` passed **35 test files / 118 tests**. The server/media group passed **3 tests** with **3 deliberately skipped by `-t` filter**; the checkout/concurrency group passed **3 tests** with the other **3 deliberately skipped by `-t` filter**. Skipped tests are not counted as passed. A whole `pnpm test:integration` invocation exceeded the execution host's 30-second response limit and did not return a final aggregate result, so it is not reported as passing.
- The historical backfill limitation remains: no real pre-migration records existed. Synthetic `LEGACY` fixtures verify compatibility only and do not prove a production historical-data backfill.
- Repository-wide `pnpm format:check` was run without writing files and currently fails on **519** pre-existing files. The changed task files pass targeted Prettier checks; no repository-wide formatting rewrite was performed.
- Door-store server-side verification is complete, but the functional phase remains open solely for the unexecuted authenticated browser reorder/primary/detach check. Online payment integration remains a later, separate phase and has not been started.

## Phase 8–11 close-out — 2026-07-18

### Phase 8

- Admin dashboard metrics + previous-period revenue comparison
- Orders: payment/date/archive filters, bulk status, archive, notes
- Users/promotions already present; checkout applies coupon codes
- Revenue-generating statuses via `store.revenue` settings

### Phase 9

- Hero CMS + contact spam/rate-limit + messages inbox
- Blog CMS/public routes + HTML sanitizer + BlogPosting JSON-LD
- Analytics dashboard + Redis cache + CSV export (formula-safe)
- Store settings (identity, branding, social, stacking, revenue, maintenance)
- Maintenance gate for non-admin storefront users

### Phase 10 (prior)

- Reviews moderation, FX conversion/cache/stale fallback, payment webhook guards

### Phase 11

- Security headers (CSP baseline, nosniff, frame deny, referrer, permissions)
- Legal route stubs (`/legal/terms`, `/legal/privacy`) — OPEN-014 copy pending
- `docs/ops/RELEASE-CHECKLIST.md` + product README
- Production deploy **not** performed (requires explicit authorization)

### Cloudinary media pipeline — 2026-11-06

- Admin product/category/hero/blog image pickers upload directly to the authenticated Cloudinary route and preview the returned secure URL.
- Media rows persist the secure URL, Cloudinary public ID and dimensions; the additive migration preserves historical object keys.
- Historical media rows are not migrated from R2 and must be re-uploaded; production migration has not been run.

### Verification

- `pnpm typecheck` — pass
- `pnpm test` — 76 passed
- `pnpm lint` — pass
- `pnpm build` — pass

### Remaining non-blocking items

- Email verify/reset, Playwright E2E suite
- Approved legal copy (OPEN-014)
- Online payment provider selection (OPEN-002)
- Real Upstash/Resend adapters when credentials provided
- Re-upload historical media rows that have no Cloudinary secure URL
