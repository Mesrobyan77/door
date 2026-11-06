# White Shop — functional specification

**Կարգավիճակ.** Draft baseline
**Տարբերակ.** 1.0
**Վերջին թարմացում.** 2026-07-17

## 1. Ընդհանուր behavior

| ID | Պահանջ |
|---|---|
| GEN-001 | Համակարգը MUST աջակցի Guest, Customer և Admin դերերին՝ server-side authorization-ով։ |
| GEN-002 | Բոլոր create/update/delete գործողությունները MUST ունենալ validation, permission check, pending/disabled state, success feedback և safe error feedback։ |
| GEN-003 | Բոլոր data surfaces-ը MUST ունենալ loading, empty, error և retry state՝ ըստ context-ի։ |
| GEN-004 | Internal navigation-ը MUST օգտագործի Next.js `Link`; full page reload չի թույլատրվում սովորական ներքին navigation-ում։ |
| GEN-005 | UI visible text-ը MUST գալ translation dictionaries-ից կամ locale-specific database content-ից։ |
| GEN-006 | Production flow-ում MUST չլինեն TODO action-ներ, mock API-ներ, fake counters, hardcoded products կամ չաշխատող forms։ |
| GEN-007 | Double submit-ը MUST չստեղծի կրկնվող record; critical command-ներն ունեն idempotency/unique guard։ |
| GEN-008 | Delete գործողությունը MUST պահանջի confirmation; financial/audit data-ն archive/anonymize է արվում։ |

## 2. Global storefront layout

### 2.1 Header

| ID | Պահանջ / acceptance criteria |
|---|---|
| NAV-001 | Header-ը ցույց է տալիս Home, Products, About, Contact, Blog, locale, currency, wishlist, cart count և account control։ |
| NAV-002 | Guest account click-ը տանում է login; Customer menu-ն ունի Profile/Logout; Admin menu-ն՝ Admin/Profile/Logout։ |
| NAV-003 | Locale switch-ը պահպանում է համարժեք route-ը և թույլատրելի query params-ը; fallback-ը locale home-ն է։ |
| NAV-004 | Currency switch-ը փոխում է display preference-ը, ոչ base price-ը։ |
| NAV-005 | Mobile navigation-ը drawer է՝ focus trap, Escape close, focus restore և accessible labels-ով։ |
| NAV-006 | Cart count-ը authoritative cart item quantity summary է, ոչ client-only fake state։ |

### 2.2 Footer և static pages

- Footer-ը ներառում է About, Contact, Blog, Terms, Privacy, Shipping, Return/Refund, Cookie, social links և copyright։
- Յուրաքանչյուր policy link ունի իրական locale route և publishable content։
- Draft/unapproved legal text-ը production publish չի արվում (`OPEN-014`)։

## 3. Home page

| ID | Պահանջ / acceptance criteria |
|---|---|
| HOME-001 | `/{locale}` page-ը պարունակում է Header, Hero, Featured Products, short About, CTA և Footer։ |
| HOME-002 | Hero query-ն վերադարձնում է միայն active slide-երը sort order-ով և locale translation-ով։ |
| HOME-003 | Slide-ը ունի desktop/mobile media; responsive `<picture>`/image behavior-ը ճիշտ asset-ն է ընտրում։ |
| HOME-004 | Hero action URL-ը validation է անցնում; internal URL-ը render է լինում `Link`-ով։ |
| HOME-005 | Featured list-ը միայն active/published, sellable products է և չի արտահոսում draft data։ |

## 4. Product catalog

### 4.1 Product list `/{locale}/products`

| ID | Պահանջ / acceptance criteria |
|---|---|
| CAT-001 | Search, min/max price, category, in-stock, sort (`newest`, `price_asc`, `price_desc`, `popular`) և page size-ը URL params-ում են։ |
| CAT-002 | Params-ը server-side parse/normalize են արվում; invalid values-ը safe default կամ validation response են տալիս։ |
| CAT-003 | Filters-ը share/refresh-ից հետո պահպանվում են; Clear Filters-ը հեռացնում է միայն catalog filter params-ը։ |
| CAT-004 | Active filter chips-ը յուրաքանչյուր filter-ի removal control ունեն։ |
| CAT-005 | Pagination-ը server-side է, stable sort/tie-breaker-ով; page size-ը allowlist-ից է։ |
| CAT-006 | Grid-ը wide desktop-ում 4, laptop-ում 3, mobile-ում 2 readable card է, առանց horizontal overflow-ի։ |
| CAT-007 | Product card-ը ցույց է տալիս media, badge, title, category, price, compare-at, computed discount %, wishlist և stock state։ |
| CAT-008 | Transparent PNG/WebP asset-ի container-ը theme-aware/transparent է և պարտադիր սպիտակ background չի ավելացնում։ |
| CAT-009 | Card click-ը տանում է `/{locale}/products/{slug}`; wishlist interaction-ը չի trigger անում card navigation-ը։ |
| CAT-010 | Unpublished/archived product-ը public catalog-ում չի ցուցադրվում։ |

### 4.2 Product detail

| ID | Պահանջ / acceptance criteria |
|---|---|
| PDP-001 | Gallery-ն ունի primary image, sorted thumbnails, responsive sizing և accessible selection; optional lightbox progressive enhancement է։ |
| PDP-002 | Detail-ը ցույց է տալիս translated title/description, categories, price, compare-at, discount badge, SKU և stock status։ |
| PDP-003 | Quantity control-ը min 1 է և չի անցնում server-confirmed purchasable stock-ը։ |
| PDP-004 | Add to Cart-ը server-side վերահաստատում է product status/stock/price և վերադարձնում է actionable conflict error։ |
| PDP-005 | Related products-ը նույն category-ից active products են, current product-ը բացառված է։ |
| PDP-006 | Metadata/JSON-LD-ը համապատասխանում է locale-specific canonical product data-ին։ |

### 4.3 Reviews

| ID | Պահանջ / acceptance criteria |
|---|---|
| REV-001 | Review section-ը ցույց է տալիս approved reviews, average և 1–5 distribution։ |
| REV-002 | Review submit կարող է անել login եղած Customer-ը, ով ունի eligible delivered/completed order item տվյալ product-ի համար։ |
| REV-003 | Rating-ը integer 1–5 է, comment-ը length/sanitization rules ունի։ |
| REV-004 | User/product զույգի համար կա առավելագույնը մեկ review (կամ approved alternate key policy ADR-ով)։ |
| REV-005 | Նոր review-ը pending moderation է; Admin-ը approve/reject է անում audit trail-ով։ |

## 5. Authentication

### 5.1 Registration/login

| ID | Պահանջ / acceptance criteria |
|---|---|
| AUTH-001 | Login-ն ունի email, password, visibility toggle, forgot password, submit և register link։ |
| AUTH-002 | Register-ն ունի first/last name, email, phone, password/confirm և required terms acceptance։ |
| AUTH-003 | Password-ը min 8 նիշ է և ունի uppercase, lowercase, digit, special character; server validation-ը authoritative է։ |
| AUTH-004 | Email-ը normalized և case-insensitive unique է; duplicate/login errors-ը account enumeration չի բացահայտում։ |
| AUTH-005 | Successful registration-ը ստեղծում է Customer account և single-use expiring email verification token։ |
| AUTH-006 | Suspended/unverified account behavior-ը policy-ով սահմանված և generic/safe է։ |
| AUTH-007 | Login/registration/reset/verification endpoints-ը rate limited են։ |

### 5.2 Password recovery/session/logout

- Forgot password-ը միշտ generic success response է տալիս։
- Reset token-ը random, hashed-at-rest, expiring և single-use է։
- Password reset/change-ից հետո affected sessions-ը revoke են արվում ըստ policy-ի։
- Logout-ը server-side invalid է դարձնում session-ը և clear է անում cookie-ն։
- Protected admin/profile routes-ը server-side redirect/deny են անում առանց միայն UI hide-ի վրա հենվելու։

## 6. Cart

| ID | Պահանջ / acceptance criteria |
|---|---|
| CART-001 | Guest cart-ը կապված է opaque cookie/session token-ի հետ և durable է PostgreSQL-ում։ |
| CART-002 | Authenticated Customer cart-ը PostgreSQL-ում է; Redis-ը optional accelerator է։ |
| CART-003 | Login-ի պահին guest և customer carts-ը idempotent transaction-ով merge են լինում։ |
| CART-004 | Add/update/remove operations-ը validate են անում product sellability/quantity և վերադարձնում updated summary։ |
| CART-005 | Cart display price-ը informative է; checkout-ը բոլոր գումարները նորից հաշվում է։ |
| CART-006 | Quantity conflict/removed product/out-of-stock item-ը պարզ ցուցադրվում է և ունի recovery action։ |

## 7. Checkout և order placement

### 7.1 Steps

1. Contact information
2. Shipping address կամ saved address selection
3. Delivery method/rule
4. Coupon
5. Order summary
6. Payment method
7. Place order

### 7.2 Acceptance criteria

| ID | Պահանջ / acceptance criteria |
|---|---|
| CHK-001 | Profile contact/address defaults-ը prefill են լինում, բայց order-ը պահում է անկախ snapshot։ |
| CHK-002 | Delivery-ը հաշվարկվում է ամենասպեցիֆիկ active rule-ով՝ City > Region > Country, ապա priority/tie-break policy-ով։ |
| CHK-003 | Coupon eligibility/value/limits/dates/user scope-ը միայն server-side authoritative հաշվարկով է։ |
| CHK-004 | Place Order-ը պահանջում է idempotency key և նույն key-ի retry-ն նույն արդյունքն է վերադարձնում։ |
| CHK-005 | Transaction-ը re-check է անում stock, prices, discounts, coupon, delivery և tax; client totals-ը անտեսվում են։ |
| CHK-006 | Transaction-ը ստեղծում է order, item/address/money snapshots, initial status history, stock movements, decrement և cart clear։ |
| CHK-007 | Անբավարար stock-ի դեպքում transaction-ը atomic rollback է լինում և user-ը ստանում է item-level conflict։ |
| CHK-008 | Order-ը պահում է base/display currency code, exchange-rate snapshot, subtotal, discount, tax, delivery և total։ |
| CHK-009 | COD adapter-ը P0 է; online provider-ը միայն approved adapter/webhook contract-ից հետո է ակտիվանում։ |
| CHK-010 | Success page-ը refresh/retry-safe է և order ownership check ունի։ |

## 8. Customer profile

### 8.1 Layout և dashboard

- Sidebar header՝ name, email, phone։
- Menu՝ Dashboard, Orders, Personal Information, Addresses, Change Password, Delete Account, Logout։
- Dashboard metrics՝ total orders, pending, completed, total spent և recent orders՝ միայն current customer-ի համար։

### 8.2 Orders

- List columns՝ order number, date, status, payment status, total, View Details։
- Detail accessible modal/drawer է՝ URL/deep-link strategy-ն կարող է progressive enhancement լինել։
- Customer-ը չի կարող դիտել ուրիշի order-ը ID/number manipulation-ով։

### 8.3 Personal information և password

- Customer-ը խմբագրում է first name, last name, email և phone։
- Email փոփոխությունը կարող է պահանջել re-verification և unique check։
- Password change-ը պահանջում է current password և revoke policy։

### 8.4 Addresses

| ID | Պահանջ / acceptance criteria |
|---|---|
| PROF-001 | CRUD drawer/modal-ը կառավարում է label, recipient names, phone, country, region, city, line1/2, postal code և default flags։ |
| PROF-002 | Մի customer-ի համար առավելագույնը մեկ default shipping և մեկ default billing հասցե կա։ |
| PROF-003 | Default փոխելը transaction-safe է; deleted address-ը չի փոխում հին order snapshot-ը։ |

### 8.5 Delete account

- Պահանջում է explicit confirmation և password re-authentication։
- Active sessions-ը revoke են արվում։
- PII-ն anonymize է արվում retention/legal policy-ով, իսկ financial/order/audit records-ը պահպանվում են։
- Վերջնական behavior-ը կախված է `OPEN-009` approval-ից։

## 9. Admin shell և common table behavior

### 9.1 Shell

- Responsive left sidebar՝ Home, Dashboard, Home Hero, Orders, Products, Categories, Coupons, Discounts, Users, Messages, Analytics, Delivery, Blog, Settings։
- Home-ը locale-aware storefront home link է։
- Desktop sidebar-ը collapsible է, mobile-ը focus-managed drawer։

### 9.2 Admin tables/forms

| ID | Պահանջ / acceptance criteria |
|---|---|
| ADM-001 | Search/filter/sort/page state-ը server contract-ով է; large datasets-ը client-only filter չեն անում։ |
| ADM-002 | Bulk action-ը validate է անում ամբողջ selection-ի permissions և transition eligibility-ն։ |
| ADM-003 | Drawer/full-page sheet-ը mobile-ում full-screen է, focus-managed և unsaved-change warning ունի։ |
| ADM-004 | Long create/edit form-ի sticky footer-ը պահում է Save/Cancel actions-ը տեսանելի։ |
| ADM-005 | Admin mutation-ը audit log է գրում actor, action, target, before/after safe diff և correlation ID-ով։ |

## 10. Admin dashboard և analytics

### Dashboard

- Cards՝ users count, products count, orders count, revenue։
- 50/50 area՝ recent orders և top-selling products։
- Date range + previous-period comparison։
- Revenue-ը ներառում է միայն settings-ում revenue-generating statuses-ը; cancelled/refunded-ը default exclude են։

### Analytics

- Revenue/orders over time, AOV, available conversion metrics, top products/categories, new/returning customers, coupon usage, status breakdown։
- Date range-ը validated/bounded է; CSV export-ը permission-protected և formula-injection safe է։
- Expensive aggregates-ը indexed/query-optimized և ըստ անհրաժեշտության Redis-cached են։

## 11. Admin hero

- List + create/edit/delete/archive/active toggle/reorder։
- Fields՝ desktop/mobile media, multilingual title/subtitle/button label, button URL, sort order, active։
- Media upload-ը R2 lifecycle-ով է; reorder-ը atomic կամ conflict-safe է։
- Public home cache/tag-ը invalid է դառնում publish-affecting mutation-ից հետո։

## 12. Admin orders

| ID | Պահանջ / acceptance criteria |
|---|---|
| AORD-001 | Table-ը ունի selection, number, customer, total, order/payment statuses, date, details և actions։ |
| AORD-002 | Search, status/payment/date filters, pagination, bulk selection և eligible bulk status update կան։ |
| AORD-003 | Default delete-ը archive է; financial/audit records hard delete չեն արվում։ |
| AORD-004 | Full-height detail drawer-ը ցույց է տալիս customer, dates, items/media/title/SKU/qty/prices, totals, address, status history և admin notes։ |
| AORD-005 | Status transition-ը server-side state machine-ով է և history row է ստեղծում նույն transaction-ում։ |
| AORD-006 | Payment status-ը միայն authorized admin կամ verified provider event կարող է փոխել։ |

## 13. Admin products և inventory

### List

- Filters՝ title/slug, SKU, category, stock, active, featured։
- Full-width Add New Product action։
- Columns՝ product/count context, stock, price, category/collection, featured/upcoming, actions, created date։

### Create/edit

| ID | Պահանջ / acceptance criteria |
|---|---|
| APROD-001 | Fields՝ title/description/SEO + generated/editable slug **ընտրված locale-ի համար** (մեկ դաշտերի հավաքածու + locale selector, `DEC-017`), SKU, media, primary/sort, categories, price, compare-at, stock, threshold, status, featured/upcoming, badge style/position։ Locale-ից անկախ fields-ը (SKU, price, stock, …) մեկ անգամ են։ |
| APROD-002 | SKU unique է; `(locale, slug)` unique է և server-side ստուգվում է constraint-ով՝ յուրաքանչյուր լրացված locale-ի համար։ |
| APROD-003 | Price/compare-at/stock/threshold constraints-ը server + DB checks ունեն։ |
| APROD-004 | Multiple images-ի primary uniqueness և sort order-ը պահպանվում են transaction-safe։ |
| APROD-005 | Product delete-ը archive/soft delete է; պատմական order item-ը չի փոխվում։ |
| APROD-006 | Stock manual adjustment-ը ստեղծում է stock movement, ոչ ուղղակի անբացատրելի overwrite։ |
| APROD-007 | Variant model-ի extension point կա, բայց launch UI-ը `OPEN-007`-ով է որոշվում։ |
| APROD-008 | Publish-ին պարտադիր է առնվազն մեկ լրիվ locale translation; բացակա locale-ում product-ը public catalog-ում չի երևում։ |

## 14. Admin categories

- Hierarchy tree/table, title/description/SEO + locale slug՝ նույն `DEC-017` pattern-ով (locale selector + մեկ դաշտերի հավաքածու), image, optional parent, sort, active։
- Parent-ը չի կարող լինել self կամ descendant; cycle prevention-ը server + transaction check է։
- Products/children ունեցող category-ի delete-ը պահանջում է reassign կամ archive։
- Public catalog/breadcrumb caches-ը invalid են դառնում mutation-ից հետո։

## 15. Coupons և automatic discounts

Երկու admin բաժինները օգտագործում են նույն `promotions` persistence model-ը։ `kind=COUPON` records-ը code/usage eligibility ունի, իսկ `kind=AUTOMATIC` records-ը product կամ category target ունի։

### Coupons

- Fields՝ name, normalized code, percentage/fixed type, value, total/per-user limits, min order, max discount, start/end, optional users, active։
- User selection չլինելու դեպքում coupon-ը հասանելի է բոլոր eligible customers/guests-ին ըստ policy-ի։
- Redemption count-ը concurrency-safe է և վերջնականացվում է order transaction-ի հետ։
- User-specific eligibility-ն relational `promotion_users` allowlist-ով է, ոչ UUID JSON array-ով։

### Discounts

- Category և Product բաժիններ; type/value/start/end/priority/active։
- Product-specific rule-ը կարող է գերակայել category rule-ին։
- Equal-priority/tie behavior-ը deterministic է և domain tests ունի։
- Discount-ը չի կարող գինը դարձնել negative կամ գերազանցել eligible amount-ը։
- Coupon stacking-ը store setting-ով է, default proposal՝ disabled։

## 16. Admin users

- Filters՝ All, Admin, Customers, Active, Suspended։
- Columns՝ user, contact, orders, role, status, created։
- Actions՝ details, role change, suspend/activate, orders, restriction։
- Admin-ը չի կարող հեռացնել իր սեփական վերջին ADMIN իրավունքը կամ համակարգը թողնել առանց active admin-ի։
- Suspension-ը revoke է անում active sessions-ը։

## 17. Contact և messages

| ID | Պահանջ / acceptance criteria |
|---|---|
| MSG-001 | Contact form՝ name, email, optional phone, subject, message։ |
| MSG-002 | Server validation, honeypot, rate limit և spam control կա; response-ը չի բացահայտում detection details։ |
| MSG-003 | Accepted message-ը պահվում է DB-ում status `unread`-ով և կարող է email notification trigger անել։ |
| MSG-004 | Admin list/detail-ը ցույց է տալիս sender, subject, email, date և unread/read/replied/archived status։ |

## 18. Delivery

- Rule fields՝ country, optional region/city, AMD price, optional free-delivery threshold, estimate days, active, priority։
- Matcher-ը ընտրում է City > Region > Country specificity, հետո priority և deterministic tie-breaker։
- Invalid overlapping rules-ը admin UI-ում warning/validation են ստանում։
- Order-ը snapshot է անում ընտրված rule label/details և final delivery amount-ը։

## 19. Blog և content

- Admin create/edit/publish/archive՝ multilingual title/excerpt/content, locale slug, cover, author, status/date, SEO, tags։
- Public routes՝ `/{locale}/blog` և `/{locale}/blog/{slug}`՝ pagination-ով։
- Միայն published և publish-date-ով հասանելի posts են public։
- Rich text-ը server-side sanitized է; stored/rendered canonical format-ը `OPEN-010`-ով է։
- BlogPosting JSON-LD, canonical, hreflang և OG metadata կան։

## 20. Settings

Store settings-ը ներառում են store name/email/phone/address, default/supported locales/currencies, logo/favicon, social links, order/revenue status configuration, low-stock default, coupon stacking, tax config, SEO defaults և maintenance mode։

- Sensitive secrets-ը database setting չեն։
- Setting key-երը typed allowlist են; value-ները schema-validated են։
- Critical setting changes-ը audit log և relevant cache invalidation ունեն։
- Maintenance mode-ը չի lock անում authorized admin/health-required access-ը՝ approved policy-ի սահմաններում։

## 21. Media/R2

| ID | Պահանջ / acceptance criteria |
|---|---|
| MED-001 | Product/category/hero/blog/branding media-ն R2-ում է, DB-ում՝ object key + metadata + alt text։ |
| MED-002 | Upload-ը presigned է և purpose/MIME/size/authorization սահմանափակումներ ունի։ |
| MED-003 | Object key-ը unique, unguessable և environment/purpose namespaced է։ |
| MED-004 | Full CDN URL-ը entity table-ում hardcode չի արվում; URL-ը config-ից է կառուցվում։ |
| MED-005 | Old object-ը delete է արվում միայն successful DB replacement-ից հետո; orphan cleanup strategy կա։ |

## 22. Responsive և accessibility common criteria

- Breakpoint QA՝ small mobile, mobile, tablet, laptop, desktop, wide desktop։
- Controls ≥44×44px where applicable; focus visible; keyboard workflows complete։
- Mobile filters/admin drawers full-screen կամ readable; data tables responsive cards/scroll affordance-ով։
- Color contrast և semantics-ը WCAG 2.2 AA target ունեն։
- Reduced-motion preference-ը հարգվում է nonessential animation/carousel-ում։

## 23. Feature completion rule

Feature-ը `Done` է միայն եթե՝

1. Real PostgreSQL persistence/query-ը աշխատում է։
2. Server validation և authorization-ը կան։
3. Loading/error/empty/success/disabled states-ը կան։
4. UI chrome dictionaries-ը (`locales/`) լրացված են բոլոր supported locale-ների համար; admin-managed content-ի համար լրացված է առնվազն այն locale-ը, որով feature-ը publish է արվում (`DEC-017`)։
5. Mobile/desktop և հիմնական keyboard flow-ը ստուգված են։
6. Relevant unit/integration/E2E tests-ը անցնում են։
7. Typecheck, lint և build regression չկա։
8. TODO/mock/fake UI կամ չաշխատող action չի մնացել։

Մանրամասն quality matrix-ը՝ [`07-TESTING-AND-QUALITY.md`](./07-TESTING-AND-QUALITY.md)։
