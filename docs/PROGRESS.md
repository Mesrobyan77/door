# White Shop — progress

**Overall status.** The existing Phase 0–11 baseline remains; the approved door-variant slice is implemented and migrated on the confirmed test database. Whole-project/release readiness is not certified, and production deployment/migrations have not been performed.
**Last update.** 2026-11-09

## Hdoors reference redesign — 2026-11-09

- Implemented the approved warm architectural reference in the existing application: dark information bar, settings-aware logo/header/footer, working header search, DB-driven hero, three populated collections, five featured cards, split CMS story/benefits, and responsive brand strip. The owner's follow-up increases hero heights to 560px desktop / 620px wide, collections to 220px, story to 280px minimum, and homepage product imagery to square frames.
- Applied warm shared tokens, Noto Latin/Cyrillic/Armenian fonts, compact cards/forms/dialogs, auth panels, catalog/PDP/wishlist/cart/checkout surfaces, profile sidebar, compact admin branding, localized legal drafts, and error/404 states. Product purchase actions now precede technical information; dimensions, handing, and package contents have separate groups. Illustrative images retain disclosure and attribution.
- Generated the separately requested transparent Hdoors logo concept, saved it under `public/assets/branding/`, and preserved configured official-logo priority through `store.branding.logoObjectKey`. No catalog photography was generated.
- Diagnosed the previously reported old catalog through the actual server runtime. It matched `.env.local` and the `ep-ancient-poetry-bdwveofc…` development branch; direct SQL returned 30 products / 29 ACTIVE / 1 DRAFT, but an English Next cache entry returned 39 cards. Product/hero cache keys now include a credential-free database scope; the new regression test covers branch isolation. No reset, import, branch switch, schema change, or deployment was performed.
- Validation: typecheck, lint, 46 unit-test files / 143 tests, optimized production build, and 58 headless-Chrome route/viewport checks passed. Browser checks cover 320/375/390/768/1440/1920px, HY/EN/RU public routes, 29 visible catalog cards in each locale, hidden Event 1 draft, search, glazed filter, gallery selection, guest cart, dialog focus/Escape, COD/contact fields, guest wishlist redirect, and native form validation. No order, external payment, or notification was submitted. Temporary browser cart lines were removed through the normal UI.
- Local C: exhaustion interrupted an initial build and left four zero-byte image-cache files. Only verified generated compiler/image caches were cleared; the subsequent build and browser pass succeeded. The temporary verification server on port 3100 was stopped; the development application remains on port 3000.
- Authenticated admin/customer screenshots and real provider/recovery delivery were not exercised without credentials. Existing legal, demo-data, exact-photography, and payment launch limitations remain. See [HDOORS-REDESIGN.md](./HDOORS-REDESIGN.md) for the route checklist and [browser report](../artifacts/hdoors-redesign/report.json) for actual checks.

## Hdoors architectural entrance and catalog layout - 2026-11-09

- Replaced the homepage carousel and CSS door mockup with the supplied reversible native-scroll architectural video, seek-optimized web derivative, static poster/final frames, reduced-motion treatment, and load-failure fallback.
- Reordered the homepage into showroom, collection stories, brand/about, factual benefits, brands, and footer.
- Consolidated storefront controls into one header and moved the catalog filters into a desktop sidebar/mobile drawer while preserving query semantics.
- No database reset/import, schema change, payment, authentication, deployment, commit, or push was performed.

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

### Registration email verification — 2026-11-06

- Registration now creates an unverified account, issues a purpose-bound hashed Redis token with a 24-hour TTL, sends a localized Resend message, and renders localized pending/success/already-used/invalid states at `/[locale]/verify-email`.
- Authenticated resend is limited to one successful request per account per minute. Delivery failure is reported as failure and releases the cooldown for an immediate retry; the fallback adapter never claims or logs a delivery.
- Purpose and user binding are validated before atomic `GETDEL`. The verified database state is persisted before destructive token consumption so a transient database failure cannot strand the account.
- Existing-account login restrictions remain unchanged pending the unresolved legacy-account policy; this slice does not lock existing accounts out.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test` (134 tests), the isolated real-Upstash concurrency integration test (1 test), and `pnpm build` passed. No real email was sent, and no production deployment or migration was performed.

### Password recovery and authentication rate limiting — 2026-11-09

- Forgot/reset now uses localized Armenian, English, and Russian UI/email copy, generic account-enumeration-safe recovery responses, trusted application URLs, purpose-bound one-hour tokens, and server-side password policy validation.
- Reset tokens use an atomic Redis claim lease. PostgreSQL row locking plus a password-version snapshot prevents concurrent/stale reuse; password update and deletion of all sessions are transactional. Redis cleanup remains a separate best-effort step, with the cross-system limitation documented in the security contract.
- Atomic hashed Redis limits now cover login, registration, forgot/reset, and verification resend origin/account scopes. Initial thresholds and fail-open/fail-closed behavior are documented and require production tuning.
- Verification on this change: unit suite, typecheck, lint, production build, changed-file formatting, and diff checks. Destructive action-level integration tests were not run against the shared configured services; real Resend delivery remains external.

### Hdoors development catalog publication — 2026-11-09

- Published 19 of the 20 source-tracked Hdoors import records in the confirmed development database. ProfilDoors 5FN remains DRAFT because its official page heading and characteristics disagree on the model.
- Applied 12 observed AMD prices and 36 synthetic development stock units through 12 auditable `IMPORT` movements; seven published products remain inquiry-only. The 18 unrelated pre-existing products were preserved.
- No exact-model image was reused because permission could not be confirmed on the reviewed product pages. Nineteen explicitly illustrative Pexels photos were API-validated, uploaded to Cloudinary, attached as primary product media, and given Armenian, English, and Russian alt text. Per-photo attribution is recorded in the import manifest.
- Added the typed `store.catalogDemo` disclosure with a visible Pexels link. Product cards now preserve image proportions with `object-contain`.
- Idempotency rerun imported zero images and created zero additional stock movements. Database verification found 19 ACTIVE / 1 DRAFT, 19 ready primary images, no duplicate SKU/slug groups, and all 18 unrelated products intact.
- Verification: lint, typecheck, 45 unit-test files / 142 tests, 2 integration files / 7 tests, production build, DB invariant script, and local HY/EN/RU storefront smoke passed. The smoke covers all 19 product links, hidden draft content, category filters, Cloudinary delivery, localized illustrative alt text, disclosure, and responsive grid markup. Integration checks cover cart rejection, discounted COD totals/snapshots/stock, idempotency, oversell protection, Redis token concurrency, and media persistence. No browser automation runtime was available for an interactive click-through; payment settings were not changed.
- The non-destructive integration harness created two timestamped `VERIFY-DOOR-*` product fixture sets across the initial failed harness run and the successful rerun; it did not alter the 18 records that predated this catalog task. The first run exposed an incomplete test cookie-store mock, which was fixed by adding the production-used `set()` method before the successful rerun.
