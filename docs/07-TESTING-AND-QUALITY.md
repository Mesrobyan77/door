# White Shop — testing and quality specification

**Կարգավիճակ.** Draft baseline
**Tooling.** Vitest, React Testing Library, Playwright, ESLint, Prettier
**Վերջին թարմացում.** 2026-07-17

## 1. Quality strategy

- Pure domain invariants-ը exhaustive unit/property-style cases են ստանում։
- Database constraints, transactions, auth և ownership-ը իրական isolated PostgreSQL integration tests են ստանում։
- UI components-ը interaction/accessibility semantics tests են ստանում, ոչ implementation-detail snapshots։
- Critical customer/admin journeys-ը Playwright E2E են։
- Build/lint/typecheck pass-ը պարտադիր է, բայց չի փոխարինում runtime/data/security tests-ին։
- Test-ը չի hide անում flaky behavior retry-ների անսահման ավելացմամբ. flake root cause-ը շտկվում է։

## 2. Test environments և data

- Unit tests-ը external network/database չեն պահանջում։
- Integration tests-ը օգտագործում են isolated PostgreSQL database/schema և իրական migrations։ SQLite substitute չի թույլատրվում PostgreSQL-specific constraints/transactions-ի համար։
- Redis/R2/email/payment-ի համար contract-testable adapters են կիրառվում; auth token TTL/atomic consume-ը Redis integration tests ունի, իսկ critical provider normalization-ը fixture/official sandbox tests ունի։
- E2E-ն աշխատում է dedicated test environment/database/bucket namespace-ում և deterministic seed/factories-ով։
- Tests-ը production credentials/data չեն օգտագործում։
- Time, random IDs, exchange rates և provider events-ը injectable/fixed են deterministic tests-ի համար։

## 3. Unit test matrix

| Domain | Minimum cases |
|---|---|
| Money | Integer arithmetic, currency scale, conversion direction, rounding, safe bounds, formatting input |
| Discounts | Product vs category priority, fixed/percent, dates, ties, cap at price, inactive rules |
| Coupons | Eligibility, normalized code, min order, max discount, user/total limit, expiry, stacking |
| Delivery | City > Region > Country, priority ties, free threshold, no-match, inactive rules |
| Slugs | Unicode/transliteration policy, normalization, empty/reserved values, uniqueness retry mapping |
| Permissions | Guest/customer/admin, suspended user, ownership, last-admin behavior |
| Stock | Add/update clamp policy, decrement, insufficient stock, movement reason/result |
| Order totals | Item lines, subtotal, discount, tax, delivery, total snapshots, invariant checks |
| Exchange rates | Fresh/stale/fallback snapshots, unsupported currency, deterministic rate snapshot |
| State machines | Allowed/forbidden order/payment/review transitions |
| Sanitization | Allowed/removed rich-text constructs, script/URL payloads |

Boundary values և invalid inputs յուրաքանչյուր pure function-ի test suite-ի մաս են։

## 4. Integration test matrix

### Auth/profile

- Registration success, normalized duplicate email, password policy, terms acceptance։
- Verification valid/expired/reused token։
- Login success/failure generic behavior, suspended/unverified policy, session creation։
- Forgot/reset generic response, valid/expired/reused token, session revocation։
- Redis token store-ը պահում է միայն hash/purpose/minimal metadata, ունի TTL և atomic single-use behavior։
- Cross-user profile/address/order access denied։
- Default address uniqueness under concurrent updates։
- Account anonymization retains financial records and revokes sessions։

### Catalog/admin

- Product create/update with all locales, SKU/slug conflicts, publish completeness։
- Product archive is absent publicly but order snapshot remains readable։
- Category parent cycle/self/descendant rejection and reassign/archive behavior։
- Media primary uniqueness/reorder/finalization authorization։
- Stock adjustment writes movement atomically։
- Hero/blog publish status and cache-tag invalidation events։

### Cart/checkout/orders

- Guest cart create/add/update/remove և token ownership։
- Guest/customer cart merge duplicates, stock changes և retry idempotency։
- Checkout profile/saved address → order address snapshot։
- Server ignores tampered price/total/coupon/delivery data։
- Concurrent last-stock checkout՝ առավելագույնը eligible orders, stock never negative։
- Same idempotency key/same payload returns same order; changed payload conflicts։
- Coupon total/per-user limit concurrent enforcement։
- Transaction rollback leaves cart/stock/order consistent on failure։
- Status update writes history/audit atomically; forbidden transition rejected։

### Providers/security

- Payment webhook invalid signature, wrong amount/currency, duplicate event, out-of-order state։
- Upload intent/finalize MIME/size/purpose/owner/object metadata failures։
- Contact honeypot/rate limit և safe response։
- Cache/Redis failure follows endpoint fallback policy and never loses authoritative data։
- Email failure after order commit is retryable and does not delete order։

## 5. Component tests

- Header account variants, cart badge semantics, locale/currency menus։
- Mobile nav/dialog/drawer focus trap, Escape, restore focus։
- Product card nested wishlist action does not navigate։
- Product gallery thumbnail keyboard behavior և quantity bounds։
- Catalog filter chips/clear controls update intended URL params։
- Forms՝ label/error summary/field error/pending/double-submit prevention։
- Data table empty/loading/error/mobile rendering և bulk selection semantics։
- Review rating radio keyboard semantics։
- Hero carousel controls, pause/reduced motion behavior։
- Order summary և price accessible labels։

## 6. Playwright critical journeys

| ID | Journey | Required assertions |
|---|---|---|
| E2E-001 | Customer register → verify → login | Real persistence/session, generic negative auth |
| E2E-002 | Browse/search/filter/sort/page products | URL persistence, server results, mobile filters |
| E2E-003 | Product detail → quantity → cart | Gallery, stock bound, card/action navigation |
| E2E-004 | Guest cart → login merge | Quantities/ownership merged once |
| E2E-005 | Checkout COD | Address/delivery/coupon, order snapshots, cart cleared |
| E2E-006 | Duplicate Place Order | One order only, same confirmation |
| E2E-007 | Customer profile/orders/addresses | Ownership, defaults, detail drawer keyboard |
| E2E-008 | Verified purchase review | Eligibility, pending moderation, admin approval/public display |
| E2E-009 | Admin product creation | Three locales, images, inventory, public appearance |
| E2E-010 | Admin order status update | History/audit/customer view updated |
| E2E-011 | Locale switching | Equivalent route/slug/query params and `<html lang>` |
| E2E-012 | Responsive/keyboard smoke | Header, filters, checkout, admin drawer at mobile/desktop |

Online payment provider-ի ավելացման դեպքում առանձին sandbox callback/webhook E2E կամ integration suite պարտադիր է։

## 7. Accessibility և visual QA

- Automated axe-style scan critical routes/states-ում՝ որպես smoke, ոչ ամբողջական փոխարինում manual review-ին։
- Keyboard-only manual pass՝ header/mobile nav, catalog filters, product gallery/rating, cart/checkout, profile order drawer, admin tables/editors։
- Screen reader spot checks՝ form errors, live messages, dialog names, totals/statuses։
- Visual regression՝ small mobile, mobile, tablet, laptop, desktop, wide desktop; Armenian/Russian long strings և transparent product media։
- Contrast/design-token audit և 200% zoom/reflow checks։

## 8. Performance և SEO QA

- Representative home/catalog/product/blog pages Lighthouse/lab check։
- Production-like RUM-ից CWV՝ LCP/CLS/INP targets։
- Bundle analysis route groups-ի համար; unexpected client component/vendor growth blocks review մինչև explanation։
- Database query plan review catalog/admin analytics/checkout hot queries-ի համար։
- Canonical, hreflang, sitemap, robots, Product/Breadcrumb/BlogPosting JSON-LD automated assertions։
- `next/image` dimensions/sizes, hero art direction, font glyph coverage և no-layout-shift checks։

## 9. Security QA

Պարտադիր negative tests-ը մանրամասն են [`05-SECURITY-AND-PRIVACY.md`](./05-SECURITY-AND-PRIVACY.md)-ում։ Milestone gate-ի նվազագույնը՝

- RBAC/IDOR, enumeration, rate-limit boundaries
- CSRF/origin policy where applicable
- XSS/sanitization և unsafe URL schemes
- Upload abuse/ownership
- Checkout replay/stock/coupon concurrency
- Webhook signature/replay/amount verification
- Last-admin և session revocation
- Secret/client bundle/log redaction review

## 10. CI pipeline և commands contract

Project scaffold-ից հետո `package.json`-ը MUST expose անել stable scripts՝

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm test:e2e
```

Առաջարկվող pipeline՝

1. Frozen install և generated/env contract checks
2. Format, lint, typecheck՝ parallel որտեղ անվտանգ է
3. Unit/component tests
4. Fresh migration + integration tests
5. Production build
6. Critical E2E ըստ PR/milestone policy-ի
7. Dependency/security և documentation link checks

Failure-ը `continue-on-error`, ignored exit code կամ disabled rule-ով չի թաքցվում։

## 11. Coverage policy

- Domain money/discount/coupon/delivery/stock/order state modules-ը բարձր branch coverage ունեն (target-ը kickoff-ին թվով lock է արվում, առաջարկ ≥90%)։
- Application/security-critical services-ի համար առաջարկվող target ≥80% branch, բայց mutation/concurrency scenario coverage-ը ավելի կարևոր է տոկոսից։
- Pure presentation code-ի blanket target-ը չի խրախուսում ցածրարժեք tests։
- Changed critical code-ը պարտադիր relevant tests է ստանում, նույնիսկ եթե global percentage-ը չի նվազում։

## 12. Test naming և traceability

- Test description-ը behavior է նկարագրում՝ `rejects a second order when the final stock unit is consumed concurrently`։
- Critical E2E/integration tests-ը references են անում requirement ID (`CHK-006`, `AORD-005`)։
- Bug fix-ը նախ ունի failing regression test, երբ reproducible է։
- Factories-ը ստեղծում են minimal valid objects և intentional overrides; giant shared fixtures-ից խուսափել։

## 13. Milestone quality gate

Յուրաքանչյուր փուլ ավարտելուց առաջ՝

- [ ] Changed scope-ի format/lint/typecheck pass
- [ ] Relevant unit/component/integration tests pass
- [ ] Critical flow E2E pass երբ feature slice-ը end-to-end հասանելի է
- [ ] Fresh migration/seed pass database փոփոխության դեպքում
- [ ] Canonical schema inventory check-ը հաստատում է ճիշտ 25 application table
- [ ] Security/accessibility/responsive checks ըստ risk-ի
- [ ] No hidden/skipped failure առանց linked approved issue-ի
- [ ] Docs/route/schema/decision records updated
- [ ] Changed file և verification summary գրանցված `PROGRESS.md`-ում

## 14. Release Definition of Done

- Բոլոր P0/P1 approved requirements-ը traceable և accepted են։
- TypeScript, ESLint, Prettier, build և required tests-ը կանաչ են։
- Production-like environment-ում critical E2E, migrations, backup/restore և provider sandbox flows verified են։
- Accessibility, security, SEO և performance launch gates-ը անցել են։
- Production secrets/env/domain/monitoring/runbooks պատրաստ են, բայց deployment-ը կատարվում է միայն explicit authorization-ով։
- TODO/mock/fake/nonfunctional actions և unsupported success claims չկան։
