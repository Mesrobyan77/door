# White Shop — progress

**Overall status.** Phases 0–11 delivered as working product slices (launch hardening docs ready; production deploy not executed)
**Last update.** 2026-07-18

## Milestones

| Phase | Name | Status | Note |
|---:|---|---|---|
| 0 | Approval | Done | Kickoff defaults |
| 1 | Foundation | Done | Next.js, i18n, providers |
| 2 | Database foundation | Done | 25 tables + seed |
| 3 | Identity and authorization | Done | DB sessions, login/register/logout |
| 4 | Catalog admin and media | Done (minimal) | Admin products/categories; R2 adapter when credentials set |
| 5 | Storefront catalog | Done (minimal) | List/detail/featured from DB |
| 6 | Cart and checkout | Done | Durable cart + COD + coupon apply |
| 7 | Customer self-service | Done (minimal) | Profile, orders, personal info |
| 8 | Admin commerce operations | Done | Dashboard, orders ops, users, promotions |
| 9 | Content / analytics | Done | Hero, contact, blog, analytics, settings |
| 10 | Reviews / currency / payments | Done | Reviews, FX cache, COD + webhook guards |
| 11 | Hardening / release | Done (docs) | Headers, legal stubs, release checklist |

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
- Re-upload existing media after enabling R2 (local `public/uploads` keys are not in the bucket)
