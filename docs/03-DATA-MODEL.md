# White Shop — canonical database specification

**Database.** PostgreSQL (Neon)
**ORM/migrations.** Drizzle ORM / Drizzle Kit
**Կարգավիճակ.** Canonical 25-table schema migrated; idempotent seed available (`pnpm db:seed`)
**Canonical table count.** 25
**Վերջին թարմացում.** 2026-07-18

## 1. Սխեմայի նպատակը

Այս model-ը պահում է production-grade relational guarantees-ը, բայց չի ստեղծում առանձին table յուրաքանչյուր ենթատեսակի կամ translation-ի համար։ Միավորումները թույլատրելի են միայն այն դեպքում, երբ չեն վնասում՝

- ownership/authorization checks,
- order և money snapshots,
- stock reconciliation,
- payment retry/idempotency,
- admin audit,
- reliable post-commit side effects։

## 2. Data conventions

- Primary keys՝ մեկ approved sortable secure strategy (`UUIDv7` առաջարկվում է)։
- Timestamps՝ `timestamptz`, UTC, `created_at`/`updated_at`; `deleted_at` միայն archive lifecycle ունեցող entities-ում։
- Money՝ `bigint`/safe integer amount, ոչ floating point։ AMD base amounts-ը whole dram են։
- Exchange rate՝ explicit precision/scale-ով PostgreSQL `numeric` և decimal-safe application library։
- Email/promotion code՝ normalized canonical value + case-insensitive unique index։
- UI translations-ը `locales/{hy,en,ru}/*.json` ֆայլերում են։
- Admin-managed multilingual content-ը parent entity-ի `translations JSONB`-ում է։
- Financial, stock և audit records-ը hard delete չեն ընդունում։
- Flexible JSONB-ը միշտ Zod schema/version ունի և business-critical relational կապերը չի փոխարինում։

## 3. Canonical 25-table inventory

| # | Table | Domain | Նշանակություն |
|---:|---|---|---|
| 1 | `users` | Identity | Account, credentials, profile, role, status |
| 2 | `sessions` | Identity | Revocable database sessions |
| 3 | `addresses` | Customer | Saved shipping/billing addresses |
| 4 | `media_assets` | Media | R2 object metadata, owner, role, ordering |
| 5 | `store_settings` | System | Typed public store configuration |
| 6 | `products` | Catalog | Product, translations, price, current stock |
| 7 | `categories` | Catalog | Hierarchy և translations |
| 8 | `product_categories` | Catalog | Product/category many-to-many կապ |
| 9 | `stock_movements` | Inventory | Immutable stock ledger |
| 10 | `hero_slides` | Content | Hero configuration և translations |
| 11 | `blog_posts` | Content | Blog content, translations և tags |
| 12 | `carts` | Commerce | Guest/customer cart identity/lifecycle |
| 13 | `cart_items` | Commerce | Cart product quantities |
| 14 | `wishlist_items` | Commerce | Customer wishlist entries |
| 15 | `promotions` | Pricing | Coupons և automatic discounts մեկ rule model-ում |
| 16 | `promotion_users` | Pricing | User-restricted promotion allowlist |
| 17 | `delivery_rules` | Fulfillment | Location-based delivery pricing |
| 18 | `orders` | Orders | Order, address/money/promotion snapshots, idempotency |
| 19 | `order_items` | Orders | Immutable purchased-item snapshots |
| 20 | `order_events` | Orders | Status, notes և payment provider events |
| 21 | `payments` | Payments | Payment attempts/current provider state |
| 22 | `reviews` | Engagement | Verified-purchase reviews/moderation |
| 23 | `contact_messages` | Support | Contact inbox |
| 24 | `audit_logs` | Security | Immutable admin/security audit |
| 25 | `outbox_events` | Reliability | Reliable post-commit email/provider/cache work |

### Count assumptions

- Login-ը email/password է։ OAuth ավելացնելիս կարող է ավելանալ `accounts` table։
- Product variants-ը launch scope-ում table չունի։ Variants ավելացնելիս առանձին schema migration է պահանջվում։
- COD և online payment attempts-ը երկուսն էլ տեղավորվում են `payments`-ում։
- Verification/reset tokens-ը PostgreSQL table չեն. դրանք Upstash Redis-ում hashed, expiring, atomic single-use records են։

## 4. Identity և customer data

### 4.1 `users`

| Column group | Պարտադիր fields/constraints |
|---|---|
| Identity | `id`, normalized `email` UNIQUE, nullable verified timestamp |
| Credentials | `password_hash` Argon2id, password-updated timestamp |
| Profile | first/last name, normalized phone |
| Authorization | role `ADMIN`/`CUSTOMER`, status `ACTIVE`/`SUSPENDED`/`ANONYMIZED` |
| Consent | terms accepted timestamp/version |
| Lifecycle | last login, created/updated/anonymized timestamps |

Last active admin invariant-ը application transaction + row/advisory lock strategy ունի։ Concurrent demotion/suspension-ը չի կարող համակարգը թողնել առանց active admin-ի։

### 4.2 `sessions`

- Session token hash/identifier, `user_id`, expiry, last activity, created timestamp։
- Index `(user_id, expires_at)` և unique session token։
- Password reset/change, suspension և account anonymization-ը revoke են անում համապատասխան sessions-ը։

### 4.3 Redis auth tokens — table չէ

Keys՝ purpose-namespaced hash, օրինակ `auth-token:verify:<sha256>` կամ `auth-token:reset:<sha256>`։ Value-ում՝ user ID, purpose, optional email version, created metadata։

- Raw token-ը database/Redis/log-ում չի պահվում։
- TTL պարտադիր է։
- Consume-ը atomic և single-use է։
- Redis loss-ի դեպքում user-ը կարող է նոր token պահանջել; durable customer/order data չի կորչում։

### 4.4 `addresses`

Fields՝ owner user, label, recipient names, phone, country code, region, city, lines, postal code, default shipping/billing flags, timestamps և optional archive timestamp։

- Partial unique indexes՝ մեկ active default shipping և մեկ active default billing հասցե per user։
- Address book mutation-ը հին order address snapshot-ը չի փոխում։

## 5. Media և settings

### 5.1 `media_assets`

Պահում է R2 `object_key` UNIQUE, MIME, byte size, dimensions, checksum/etag, upload status, role, sort order, primary flag, locale alt texts JSONB և timestamps։

Entity ownership-ը պահվում է typed nullable FKs-ով՝

- `product_id`
- `category_id`
- `hero_slide_id`
- `blog_post_id`

`CHECK` constraint-ը պահանջում է՝ ready entity media-ի համար ճիշտ մեկ owner, pending upload-ի համար owner-ի ժամանակավոր բացակայություն, branding asset-ի համար explicit `purpose`։ Generic `owner_type + owner_id` polymorphic կապ չի օգտագործվում, որպեսզի foreign key protection-ը չկորչի։

Partial unique constraints՝

- մեկ primary media per product,
- մեկ desktop և մեկ mobile media role per hero slide,
- մեկ cover media per blog post/category՝ ըստ role policy-ի։

Full CDN URL չի պահվում. URL-ը կառուցվում է config-ից։

### 5.2 `store_settings`

Typed key/value model՝ store identity, public contacts/address, locales/currencies, branding references, social links, revenue-generating statuses, low-stock default, promotion stacking, tax, SEO defaults և maintenance mode։

- Key-ը allowlist է, value-ն versioned Zod JSON schema ունի։
- Secrets/API credentials այստեղ չեն պահվում։

## 6. Catalog և inventory

### 6.1 `products`

| Group | Fields/invariants |
|---|---|
| Identity | ID, normalized SKU UNIQUE |
| Translations | `translations JSONB` — optional per-locale objects (`hy`/`en`/`ru`) with title, slug, description, SEO |
| Pricing | base/compare-at AMD integer amounts, non-negative checks |
| Inventory | `stock_on_hand`, low-stock threshold, optional optimistic version; non-negative առանց backorder approval-ի |
| Lifecycle | draft/active/archived, featured/upcoming, timestamps/deleted_at |
| Presentation | badge label translations/style/position |

Translation JSON schema-ն թույլ է տալիս partial locales (`DEC-017`)։ Publish-ին պարտադիր է առնվազն մեկ լրիվ locale object; բացակա locale-ը այդ storefront լեզվում չի ցուցադրվում։ Fixed locale slug uniqueness-ը enforce է արվում expression unique indexes-ով միայն առկա locale keys-ի համար, օրինակ `translations->'hy'->>'slug'`։

Current stock-ը `products`-ում է արագ և atomic availability check-ի համար։ Ամեն manual/order stock mutation-ը նույն transaction-ում `stock_movements` row է ստեղծում։

### 6.2 `categories`

Self-referencing `parent_id`, `translations JSONB`, sort order, active/archive state և timestamps։

- Locale slug expression indexes՝ unique per locale։
- Self/descendant parent արգելքը application recursive check + transaction guard է։
- Children/products ունեցող category-ն reassign կամ archive է արվում։

### 6.3 `product_categories`

Composite unique `(product_id, category_id)`, optional `is_primary`, sort metadata և reverse lookup indexes։ Պահվում է, որովհետև product-ը կարող է ունենալ մի քանի category։

### 6.4 `stock_movements`

Immutable ledger՝ product, signed delta, reason (`ORDER`,`CANCEL`,`RETURN`,`ADMIN_ADJUSTMENT`,`IMPORT`...), optional order/actor, resulting balance, correlation ID և timestamp։

Direct unexplained stock overwrite չի թույլատրվում։

## 7. Content

### 7.1 `hero_slides`

`translations JSONB`՝ locale title/subtitle/button label, validated button URL, sort order, active և timestamps։ Desktop/mobile assets-ը resolve են լինում `media_assets.hero_slide_id + role`-ով։

### 7.2 `blog_posts`

Author, status, publish timestamp, `translations JSONB` (title/slug/excerpt/sanitized content/SEO), `tags JSONB`/validated string array և timestamps/archive state։ Locale slug expression indexes-ը unique են։ Cover-ը `media_assets` relation է։

Tags-ը standalone taxonomy չէ initial scope-ում, հետևաբար առանձին tag tables պետք չեն։

## 8. Cart և wishlist

### 8.1 `carts`

Nullable user կամ guest token hash, status (`ACTIVE`,`MERGED`,`CONVERTED`,`ABANDONED`), timestamps/expiry։ Partial unique constraints՝ մեկ active customer cart և unique active guest token։

### 8.2 `cart_items`

Cart/product, quantity > 0, timestamps և unique `(cart_id, product_id)`։ Cart-ի ցուցադրվող price-ը authoritative snapshot չէ. checkout-ը նորից հաշվարկում է։

### 8.3 `wishlist_items`

Direct `(user_id, product_id)` unique relation և timestamps։ Առանձին `wishlists` container table պետք չէ։ Guest wishlist-ը կարող է local preference լինել մինչև login merge policy հաստատելը։

## 9. Unified promotions և delivery

### 9.1 `promotions`

Մեկ rule model coupons և automatic product/category discounts-ի համար։

| Field | Behavior |
|---|---|
| `kind` | `COUPON` կամ `AUTOMATIC` |
| `code` | Coupon-ի համար normalized/unique, automatic-ի համար NULL |
| target | nullable `product_id` կամ `category_id`; order-level coupon-ի համար երկուսն էլ NULL |
| discount | `PERCENTAGE`/`FIXED`, value, optional max amount |
| eligibility | minimum order, total/per-user limits, `used_count` |
| schedule | start/end, active, priority |
| stacking | validated policy flag/metadata |

DB `CHECK` constraints՝

- `COUPON` → code required։
- `AUTOMATIC` → exactly one product/category target required։
- Product/category target միաժամանակ չեն կարող լինել։
- Percentage/fixed values և dates valid ranges-ում են։

Coupon redemption history-ը derive է արվում indexed `orders.promotion_id + user_id + qualifying status` տվյալներից։ `used_count`-ը checkout transaction-ում atomic increment է և ունի cancellation/refund compensation policy։

### 9.2 `promotion_users`

Composite unique `(promotion_id, user_id)` allowlist։ Zero rows նշանակում է promotion-ը user-restricted չէ։ Այս table-ը պահվում է UUID array/JSONB-ից խուսափելու և FK integrity ապահովելու համար։

### 9.3 `delivery_rules`

Country, optional region/city, AMD price, optional free threshold, estimated days, active, priority և timestamps։ Matcher՝ City > Region > Country, ապա priority և deterministic ID tie-breaker։

## 10. Orders և payments

### 10.1 `orders`

| Group | Պարտադիր snapshot/data |
|---|---|
| Identity | ID, unique order number, nullable user, guest/customer contact snapshot |
| State | order status, payment status, archive flag, placed/updated timestamps |
| Money | base/display currency, exchange-rate source/effective/rate snapshot, subtotal/discount/tax/delivery/total |
| Address | `shipping_address JSONB`, `billing_address JSONB` immutable validated snapshots |
| Promotion | nullable `promotion_id`, code/type/value/discount amount snapshot |
| Delivery | nullable rule ID + label/estimate/price snapshot |
| Idempotency | checkout scope hash + idempotency key hash + request fingerprint UNIQUE |
| Context | locale, correlation ID |

Order JSON snapshots-ը versioned Zod schema ունեն։ Client total/stock/promotion/delivery տվյալները authoritative չեն։

### 10.2 `order_items`

Order, nullable product reference, product title/SKU/image/attributes snapshots, quantity, unit base/display amounts, compare-at, discount/tax/line totals և currency context։ Product update/archive-ից հետո պատմական order-ը նույնն է մնում։

### 10.3 `order_events`

Միավորում է order status history, internal admin notes և verified payment provider events։ Fields՝ order, event type, from/to state, actor, visibility, safe structured payload, provider event ID, correlation ID և timestamp։

- Provider event ID partial unique index ունի replay protection-ի համար։
- Customer response-ը raw events չի վերադարձնում. միայն explicitly public event type allowlist է օգտագործվում, որպեսզի internal note-ը չարտահոսի։
- Event rows immutable են։

### 10.4 `payments`

Order, provider/method, provider reference, requested amount/currency, current status, attempt number, safe metadata և timestamps։ Մեկ order-ը կարող է ունենալ COD row կամ բազմաթիվ online attempts։ Card/secret/full sensitive payload չի պահվում։

## 11. Reviews և support

### 11.1 `reviews`

User, product, eligible order item, rating 1–5, plain/sanitized comment, moderation status/actor/time/reason և timestamps։ Unique `(user_id, product_id)` proposed invariant։ Public aggregates-ը միայն approved rows են։

### 11.2 `contact_messages`

Name, normalized email, optional phone, subject, message, status (`UNREAD`,`READ`,`REPLIED`,`ARCHIVED`), minimal spam metadata և timestamps։ Raw IP retention-ը privacy policy է պահանջում։

## 12. Security և reliability records

### 12.1 `audit_logs`

Immutable admin/security log՝ actor, action, target type/id, safe before/after diff, request/correlation ID, policy-compliant request context և timestamp։ Secrets, password hashes, tokens և full payment payloads չեն պահվում։

### 12.2 `outbox_events`

Reliable post-commit work՝ event type, aggregate type/id, versioned payload, status, attempt count, `available_at`, processed/error timestamps։ Օգտագործվում է order emails, cache invalidation coordination և provider follow-up-ի համար։

Outbox-ը audit log-ի հետ չի միավորվում. audit-ը immutable evidence է, outbox-ը mutable processing queue state։

## 13. Redis-only data — PostgreSQL tables չեն

- Verification/reset hashed tokens + TTL + atomic consume
- Rate-limit buckets
- Exchange-rate serving cache
- Analytics/query cache
- Product view counters
- Short-lived checkout idempotency guard (durable unique key-ը `orders`-ում է)
- Cache invalidation coordination

Redis loss-ը չի կորցնում order/cart/product/user durable source of truth-ը։

## 14. Foreign-key delete policy

| Relationship | Policy |
|---|---|
| User → sessions | `CASCADE` թույլատրելի է ephemeral sessions-ի համար |
| User → addresses/cart/wishlist | account anonymization transaction; hard delete միայն safe ephemeral rows-ի համար |
| User → orders/reviews/audit | Retain/restrict; anonymize PII, ոչ cascade |
| Product → categories/media/stock | Archive product; physical cleanup միայն explicit maintenance-ում |
| Product → order items/stock movements | Retain/restrict historical references |
| Category → children/product relations | Reassign/archive, default `RESTRICT` |
| Order → items/events/payments | `RESTRICT`; order hard delete արգելված է |
| Promotion → orders | Retain reference/snapshot; archive promotion |
| Media owner → asset | Replace/archive workflow; R2 delete միայն DB commit-ից հետո |

## 15. Minimum indexes/constraints

- Users՝ normalized email unique, role/status, created date։
- Sessions՝ token unique, user/expiry։
- Addresses՝ owner + partial default indexes։
- Products/categories/blog/hero՝ status/date/sort + fixed-locale slug expression unique indexes։
- Media՝ object key unique, owner/role/sort և partial primary/cover/desktop/mobile uniqueness։
- Product-category both lookup directions։
- Products stock/low-stock և stock movements product/time/order։
- Carts active owner/token և cart items composite unique։
- Wishlist user/product unique։
- Promotions normalized code unique, active/date/target indexes; promotion users composite unique։
- Delivery active country/region/city/priority։
- Orders order number, user/date, status/date, payment status/date, promotion/user/status և durable idempotency composite unique։
- Order items order/product; order events order/time/type և provider event partial unique։
- Payments order/attempt, provider reference/status։
- Reviews user/product unique, product/status/date։
- Contact status/date; audit actor/target/time; outbox status/available time։

Actual indexes-ը validate են արվում representative data-ի `EXPLAIN (ANALYZE, BUFFERS)`-ով։

## 16. Tables intentionally not merged

| Tables | Պատճառ |
|---|---|
| `orders` / `order_items` | One-to-many snapshots, analytics, returns/refunds extensibility |
| `products` / `stock_movements` | Current state vs immutable reconciliation ledger |
| `carts` / `cart_items` | Cart lifecycle vs item quantities/uniqueness |
| `products` / `categories` | Many-to-many և independent hierarchy/lifecycle |
| `orders` / `payments` | Multiple attempts/providers և webhook reconciliation |
| `order_events` / `audit_logs` | Customer-facing domain history vs global sensitive audit |
| `audit_logs` / `outbox_events` | Immutable evidence vs mutable retry queue |
| `users` / `addresses` | Multiple saved addresses և independent defaults |

## 17. Optional future tables — canonical 25-ի մեջ չեն

- `accounts` — OAuth/social login ավելացնելիս։
- Variant/inventory tables — իրական product variants ավելացնելիս։
- `refunds`/`returns` — partial refund/return workflows launch scope մտնելիս։
- Durable analytics aggregates — միայն measured query/load need-ից հետո։

Նոր table-ը պահանջում է migration rationale. այն չի ավելացվում միայն հնարավոր ապագա feature-ի համար։

## 18. Migration և seed acceptance criteria

- [x] Fresh migration-ը ստեղծում է ճիշտ 25 application table։
- [x] Յուրաքանչյուր FK ունի explicit delete behavior։
- [ ] JSONB schemas/versioning և locale expression indexes tested են։
- [ ] Money/range/exactly-one-owner/target constraints tested են։
- [ ] Concurrent checkout/promotion usage/stock/last-admin tests անցնում են։
- [ ] Redis token TTL և atomic single-use tests անցնում են։
- [x] Seed-ը idempotent է և ստեղծում է admin/customers/catalog/hero/delivery/promotions/blog (sample orders՝ հետագա)։
- [x] Seed credentials-ը env-ից են; production default credential չկա։
- [x] Production migration-ը application startup-ում auto-run չի արվում։
