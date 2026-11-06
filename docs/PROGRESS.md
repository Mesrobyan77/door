# White Shop — progress

**Overall status.** Phases 0–11 delivered; approved door-variant slice integrated (migration prepared, not applied); production deploy not executed
**Last update.** 2026-11-06

## Milestones

| Phase | Name | Status | Note |
|---:|---|---|---|
| 0 | Approval | Done | Kickoff defaults |
| 1 | Foundation | Done | Next.js, i18n, providers |
| 2 | Database foundation | Done | 25-table baseline + seed; canonical model is now 26 tables, with door-variant migration prepared but not applied |
| 3 | Identity and authorization | Done | DB sessions, login/register/logout |
| 4 | Catalog admin and media | Done (minimal) | Admin products/categories; Cloudinary upload endpoint with pending media finalization |
| 5 | Storefront catalog | Done (minimal) | List/detail/featured from DB |
| 6 | Cart and checkout | Done | Durable cart + COD + coupon apply |
| 7 | Customer self-service | Done (minimal) | Profile, orders, personal info |
| 8 | Admin commerce operations | Done | Dashboard, orders ops, users, promotions |
| 9 | Content / analytics | Done | Hero, contact, blog, analytics, settings |
| 10 | Reviews / currency / payments | Done | Reviews, FX cache, COD + webhook guards |
| 11 | Hardening / release | Done (docs) | Headers, legal stubs, release checklist |

## Approved door-variant slice

- `products` holds the shared door model/specifications; `product_variants` holds sellable configurations, SKU, price, stock and measurements.
- Admin editing, storefront selection, cart, checkout, stock movements, promotion targeting and order snapshots use variant identity.
- Migration `0004_door_variants.sql` backfills legacy products into same-ID `LEGACY` variants and preserves existing order-item history. It is prepared only; it has not been applied to any database.
- Variant-owned media is supported by the schema and storefront query, but the admin product editor does not yet provide a variant-specific image assignment flow.

### Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm db:check`, and `pnpm build` pass.
- `pnpm test` passes: 113 tests across 33 files.
- `pnpm format:check` could not run because the `prettier` executable is not installed.
- The SQL migration has not been applied or integration-tested against a database.

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
