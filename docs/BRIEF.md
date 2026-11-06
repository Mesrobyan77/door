# White Shop — նախագծի brief

**Փաստաթղթի կարգավիճակ.** Draft for approval
**Տարբերակ.** 1.0
**Ամսաթիվ.** 2026-07-17
**Source of truth.** Օգտատիրոջ տրամադրած 37-բաժնանոց product prompt-ը

## Նկարագրություն

White Shop-ը բազմալեզու, բազմարժույթ, production-ready e-commerce հարթակ է՝ հանրային storefront-ով, customer profile-ով և լիարժեք admin panel-ով։ Համակարգը պետք է ապահովի ապրանքների կառավարում, գնումների ամբողջական հոսք, պատվերների և պաշարների հուսալի հաշվառում, կոնտենտի կառավարում, analytics և անվտանգ վարչարարություն։

Համակարգի ֆինանսական և օպերացիոն source of truth-ը PostgreSQL-ն է։ Redis-ը կիրառվում է միայն արագացման, rate limiting-ի, կարճաժամկետ idempotency-ի և cache coordination-ի համար։

## Նպատակներ

1. Ստեղծել արագագործ և SEO-friendly storefront հայերեն, անգլերեն և ռուսերեն լեզուներով։
2. Ապահովել guest-ից մինչև վճարում/պատվեր ամբողջական և իրական տվյալներով checkout flow։
3. Customer-ին տրամադրել պատվերների, անձնական տվյալների և հասցեների self-service կառավարում։
4. Admin-ին տրամադրել catalog, orders, promotions, users, content, delivery, analytics և settings կառավարում։
5. Պահպանել ֆինանսական, stock և audit տվյալների ամբողջականությունը concurrency-ի ու retry-ների պայմաններում։

## Թիրախային լսարան և դերեր

- **Guest.** դիտում և որոնում է catalog-ը, ընտրում locale/currency, պահում wishlist/cart, գրանցվում կամ checkout է սկսում։
- **Customer.** գնում է ապրանքներ, կառավարում է profile/address-ները, դիտում է պատվերները և verified purchase-ից հետո թողնում review։
- **Admin.** կառավարում է store-ը, catalog-ը, orders-ը, promotions-ը, users-ը, content-ը, delivery-ն և analytics-ը։
- **Operations/Support.** Admin role-ի շրջանակում մշակում է պատվերներ, հաղորդագրություններ և customer խնդիրներ։ Առանձին role-երի ընդլայնումը v1-ից հետո է։

## Հիմնական user journeys

1. Guest-ը փոխում է լեզուն և արժույթը՝ պահպանելով ընթացիկ route/search params-ը։
2. Guest-ը filter/search է անում product list-ում, բացում product-ը, ավելացնում cart/wishlist և checkout է անցնում։
3. Guest cart-ը login/registration-ից հետո merge է լինում customer-ի durable cart-ի հետ։
4. Customer-ը ընտրում/ստեղծում է հասցե, կիրառում coupon, ընտրում delivery/payment և idempotent կերպով ստեղծում order։
5. Customer-ը դիտում է order detail-ը և միայն կատարված գնումից հետո ստեղծում մեկ review տվյալ product-ի համար։
6. Admin-ը ստեղծում է product՝ locale selector-ով մեկ դաշտերի հավաքածուով (ցանկալի լեզուներով), upload է անում պատկերներ, կառավարում stock/discount/status-ը և հրապարակում այն։
7. Admin-ը մշակում է order status/payment status-ը՝ history և audit trail-ով։
8. Admin-ը կառավարում է hero, categories, coupons, delivery rules, blog, messages և store settings։

## Scope և առաջնայնություններ

### P0 — վաճառքի համար պարտադիր

- Locale-aware storefront, navigation, home, products և product details
- Authentication, email verification, password reset, RBAC
- Product/category/catalog, stock, cart, checkout և order transaction
- Customer profile, addresses և orders
- Admin dashboard, products, categories և orders
- Cash on Delivery payment adapter և admin-managed payment status
- R2 image storage, Redis rate limiting/cache, Resend-compatible email abstraction
- Security baseline, SEO baseline, accessibility, responsive states
- Unit, integration և critical Playwright E2E tests

### P1 — launch completeness

- Wishlist, verified-purchase reviews և moderation
- Coupons, category/product discounts և stacking policy
- Delivery rules ըստ location specificity-ի
- Home hero CMS, blog CMS, contact/messages
- Currency conversion abstraction և rate snapshot
- Admin users, analytics, CSV export և settings
- Policy pages, sitemap, hreflang և structured data

### P2 — launch-ից հետո կամ առանձին հաստատմամբ

- Online payment provider-ներ (Ameriabank/ArCa/Idram/Telcell/FastShift կամ այլ)
- Product variants-ի ամբողջական UI (schema extension point-ը v1-ում նախատեսվում է)
- Advanced search provider, realtime inventory, background queue
- Granular staff roles/permissions, refunds automation, tax engine
- Advanced conversion tracking և personalization

## Հաստատված տեխնոլոգիական սահմաններ

- Next.js App Router, React Server Components, TypeScript strict
- PostgreSQL on Neon և Drizzle ORM
- Auth.js, Argon2id, Upstash Redis/Ratelimit
- Cloudflare R2, Tailwind CSS, shadcn/ui
- React Hook Form + Zod, TanStack Table, selective TanStack Query
- Embla Carousel, Lucide React, email provider abstraction (սկզբնական adapter՝ Resend)
- Vitest, React Testing Library, Playwright, ESLint, Prettier, pnpm
- Firebase, Supabase և այլ database platform-ներ չեն օգտագործվում

Exact dependency versions-ը pin է արվում implementation kickoff-ի պահին՝ latest stable compatible matrix-ով և lockfile-ով։

Canonical PostgreSQL model-ը lean 25-table schema է։ UI copy-ն locale JSON files-ում է, admin-managed multilingual content-ը parent entity JSONB-ում, իսկ միավորված promotions/order/media model-ները մանրամասն սահմանված են `03-DATA-MODEL.md`-ում։

## Բիզնես invariants

- Base currency-ն AMD է, գումարները պահվում են integer minor/base units-ով, ոչ floating point-ով։
- Display currency փոխելը չի փոխում database-ի base price-ը։
- Order-ը պահում է currency, exchange-rate և բոլոր գումարների snapshot-ները։
- Client-ի ուղարկած total/discount/delivery/stock տվյալները վստահելի չեն և server-side վերահաշվարկվում են։
- Order creation-ը atomic և idempotent է, stock-ը transaction-ում re-check/decrement է լինում։
- Financial և audit records-ը hard delete չեն արվում։
- Product-ի հետագա փոփոխությունը չի փոխում պատմական order item snapshot-ը։
- Յուրաքանչյուր mutation ունի validation, authorization, error mapping և audit՝ ըստ ռիսկի։

## Չափ և architecture առաջարկ

- **Product scope.** Size C՝ 50+ capabilities, բազմաթիվ integration-ներ և բարձր data-integrity պահանջներ։
- **Առաջարկվող initial deployment.** մեկ Next.js modular monolith՝ feature-based boundaries-ով։
- **Պատճառ.** prompt-ը սահմանում է մեկ full-stack Next.js application, իսկ առանձին API app-ի կամ microservice-ի ապացուցված կարիք դեռ չկա։ Module boundaries-ը պետք է թույլ տան հետագայում extraction առանց business logic rewrite-ի։

Այս որոշումը provisional է և հաստատվում է `docs/TECH_CARD.md` approval-ի ժամանակ։

## Ոչ ֆունկցիոնալ նպատակներ

- Core Web Vitals՝ LCP < 2.5s, CLS < 0.1, INP < 200ms (75-րդ percentile, իրական traffic-ի դեպքում)
- Keyboard navigation, visible focus, semantic landmarks, ≥44×44px touch targets
- No horizontal overflow բոլոր սահմանված breakpoints-ում
- Server-side authorization և validation բոլոր privileged mutation-ների համար
- Graceful loading/error/empty/retry states բոլոր հիմնական screens-ում
- Observability՝ structured logs, error tracking և checkout/order audit correlation

## Constraints

- Production deployment և production migration-ը այս specification task-ի scope-ում չեն։
- Իրական credentials/secrets չեն գրվում repository-ում։
- Չեն թույլատրվում mock API-ներ, hardcoded catalog, fake counters, TODO button-ներ կամ չաշխատող forms production scope-ում։
- Առկա architecture-ը հետագայում չի փոխվում առանց approved ADR/task-ի։

## Բաց որոշումներ

Տե՛ս [`DECISIONS.md`](./DECISIONS.md)։ Ամենակարևոր approval-ները՝ architecture layout, hosting/runtime, online payment provider, tax policy, exchange-rate source, product variants launch scope և analytics/error-tracking provider։

## Կապված փաստաթղթեր

- [`00-SPECIFICATION-INDEX.md`](./00-SPECIFICATION-INDEX.md)
- [`TECH_CARD.md`](./TECH_CARD.md)
- [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md)
- [`02-FUNCTIONAL-SPECIFICATION.md`](./02-FUNCTIONAL-SPECIFICATION.md)
- [`03-DATA-MODEL.md`](./03-DATA-MODEL.md)
- [`08-IMPLEMENTATION-PLAN.md`](./08-IMPLEMENTATION-PLAN.md)
