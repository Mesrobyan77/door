# White Shop — routes and application contracts

**Կարգավիճակ.** Draft
**Տարբերակ.** 1.0
**Վերջին թարմացում.** 2026-07-17

## 1. Contract principles

- Public browser routes-ը locale-prefixed են, default locale-ն նույնպես՝ `/hy/...` canonical URL-ով։
- First-party UI mutations-ը նախընտրելի է իրականացնել Server Actions-ով; webhooks, uploads, downloads/CSV և Auth.js callbacks-ը Route Handlers են։
- Server Action-ը public trust boundary է. input-ը, session-ը և permission-ը միշտ կրկին ստուգվում են։
- Domain command-ները transport-agnostic են և չեն վերադարձնում raw Drizzle/provider objects։
- Stable error codes-ը UI translation key-երի հետ map են արվում; sensitive internal error message-ը client չի փոխանցվում։

## 2. Public route inventory

| Route | Access | Rendering/behavior |
|---|---|---|
| `/` | Public | Redirect to detected/saved locale կամ `/hy` |
| `/[locale]` | Public | Home, cached/tagged RSC |
| `/[locale]/products` | Public | URL-filtered catalog, server pagination |
| `/[locale]/products/[slug]` | Public | Product detail; locale slug lookup; 404 unpublished/missing |
| `/[locale]/about` | Public | Locale content |
| `/[locale]/contact` | Public | Contact form + rate limit |
| `/[locale]/blog` | Public | Published posts, pagination |
| `/[locale]/blog/[slug]` | Public | Published locale post |
| `/[locale]/policies/terms` | Public | Versioned approved content |
| `/[locale]/policies/privacy` | Public | Versioned approved content |
| `/[locale]/policies/shipping` | Public | Approved content |
| `/[locale]/policies/returns` | Public | Return/refund content |
| `/[locale]/policies/cookies` | Public | Cookie content |
| `/[locale]/cart` | Public | Guest/customer scoped dynamic page |
| `/[locale]/checkout` | Public | Guest/customer dynamic checkout |
| `/[locale]/checkout/success/[orderNumber]` | Owner only | Retry-safe confirmation |

## 3. Authentication routes

| Route | Access | Notes |
|---|---|---|
| `/[locale]/login` | Guest | Authenticated user redirects safely |
| `/[locale]/register` | Guest | Terms version captured |
| `/[locale]/forgot-password` | Guest | Generic response |
| `/[locale]/reset-password` | Token holder | Token query is never logged/rendered into analytics |
| `/[locale]/verify-email` | Token holder | Single-use result state |

`callbackUrl`/return-to value-ը միայն same-origin allowlisted path է. open redirect չի թույլատրվում։

## 4. Customer routes

Բոլոր routes-ը պահանջում են active authenticated Customer/Admin և ownership-scoped data։

| Route | Content |
|---|---|
| `/[locale]/profile` | Dashboard metrics/recent orders |
| `/[locale]/profile/orders` | Paginated orders |
| `/[locale]/profile/orders/[orderNumber]` | Optional deep-link detail; drawer կարող է intercept route օգտագործել |
| `/[locale]/profile/personal-information` | Profile edit |
| `/[locale]/profile/addresses` | Address CRUD |
| `/[locale]/profile/change-password` | Re-authenticated password change |
| `/[locale]/profile/delete-account` | Re-authenticated anonymization request |

## 5. Admin routes

Բոլոր admin routes-ը server-side պահանջում են `role=ADMIN` և `status=ACTIVE`։

| Route | Capability |
|---|---|
| `/[locale]/admin` | Dashboard |
| `/[locale]/admin/hero` | Hero slide management |
| `/[locale]/admin/orders` | Order list/bulk actions |
| `/[locale]/admin/orders/[orderNumber]` | Detail/deep-link drawer |
| `/[locale]/admin/products` | Product list/create/edit drawer routes |
| `/[locale]/admin/products/[id]` | Product editor/deep link |
| `/[locale]/admin/categories` | Category hierarchy CRUD |
| `/[locale]/admin/coupons` | Coupon CRUD |
| `/[locale]/admin/discounts` | Category/product discount management |
| `/[locale]/admin/users` | User/role/status management |
| `/[locale]/admin/messages` | Contact inbox |
| `/[locale]/admin/analytics` | Metrics + CSV export |
| `/[locale]/admin/delivery` | Delivery rules |
| `/[locale]/admin/blog` | Blog CMS |
| `/[locale]/admin/settings` | Typed store settings |

## 6. Non-page HTTP endpoints

| Endpoint family | Method | Purpose/security |
|---|---|---|
| `/api/auth/[...nextauth]` | Auth.js-defined | Auth callbacks/session; Auth.js contract |
| `/api/uploads/intents` | POST | Admin upload intent; auth, purpose/MIME/size validation, rate limit |
| `/api/uploads/[id]/finalize` | POST | Ownership/object metadata verification |
| `/api/webhooks/payments/[provider]` | POST | Signature verification, raw body requirements, provider-event idempotency |
| `/api/exports/admin/analytics` | GET/POST | Admin-only, bounded date range, CSV injection protection |
| `/sitemap.xml` | GET | Locale-aware generated sitemap |
| `/robots.txt` | GET | Environment-aware crawler policy |

Նոր public HTTP endpoint ավելացնելիս պետք է փաստաթղթավորել auth, validation schema, rate limit, idempotency, cache policy և audit behavior։

## 7. URL search parameter contracts

### Product catalog

| Param | Type/default | Validation |
|---|---|---|
| `q` | trimmed string | max length, normalized whitespace |
| `minPrice` | integer display/base policy | non-negative; conversion filtering policy must be deterministic |
| `maxPrice` | integer | `>= minPrice` |
| `category` | locale slug or repeated slugs | active category only |
| `inStock` | boolean | `true`/`false` allowlist |
| `sort` | enum | `newest`, `price_asc`, `price_desc`, `popular` |
| `page` | positive integer, default 1 | bounded |
| `pageSize` | allowlist, proposed 12/24/48 | max protected |

Price filter-ի canonical semantics-ը պետք է product owner-ը հաստատի multi-currency UI-ի համար։ Առաջարկ՝ URL amounts-ը selected display currency-ով ընդունել, server-side deterministic կերպով base AMD range-ի փոխարկել նույն effective rate-ով և UI-ում նշել currency-ն։ Alternative՝ միշտ AMD params։

### Admin lists

Shared params՝ `q`, feature-specific filters, `sort`, `page`, `pageSize`, optional `from`/`to` ISO dates։ Unknown params-ը ignored/normalized են կամ վերադարձնում են typed filter error՝ UI behavior-ի համաձայն։ Date range-ը server-side max window ունի analytics abuse-ից պաշտպանվելու համար։

## 8. Mutation command matrix

| Command | Actor | Transaction/idempotency | Side effects |
|---|---|---|---|
| `registerCustomer` | Guest | Email unique; retry-safe response | Verification email/outbox |
| `login` | Guest | Rate limited | Session, guest cart merge |
| `updateProfile` | Owner | Optimistic concurrency optional | Email re-verification when changed |
| `upsertAddress` | Owner | Default flags transaction | Checkout reads refresh |
| `deleteAccount` | Owner re-auth | Anonymization transaction | Sessions revoke, audit |
| `addCartItem` | Guest/Customer | Unique cart item upsert | Cart summary refresh |
| `mergeGuestCart` | Customer | Idempotent transaction | Guest token revoke |
| `applyCouponPreview` | Guest/Customer | Read-only preview | No redemption reservation by default |
| `placeOrder` | Guest/Customer | Required idempotency + DB transaction | Stock, order, payment init/outbox |
| `submitReview` | Customer | Eligibility + unique invariant | Moderation queue/admin refresh |
| `submitContactMessage` | Public | Rate/honeypot; duplicate guard optional | Admin notification |
| `create/updateProduct` | Admin | Transaction | Audit, media links, cache invalidation |
| `adjustStock` | Admin | Movement + inventory atomic | Audit, low-stock/cache effects |
| `changeOrderStatus` | Admin | State transition transaction | History, audit, email/event |
| `changePaymentStatus` | Admin/provider | Transition + event idempotency | Audit/order refresh |
| `upsertPromotion` | Admin | Validated transaction | Pricing cache invalidation |
| `updateUserRole/status` | Admin | Last-admin/suspension invariant | Sessions revoke, audit |
| `updateStoreSettings` | Admin | Typed setting transaction | Cache/config refresh, audit |

## 9. Standard command result

Server Actions-ը վերադարձնում են discriminated result, ոչ exception details՝

```ts
type CommandResult<T> =
  | { ok: true; data: T; correlationId: string }
  | {
      ok: false;
      code: AppErrorCode;
      fieldErrors?: Record<string, string[]>;
      correlationId: string;
      retryable?: boolean;
    };
```

Sensitive auth endpoint-ը կարող է intentionally նույն code/message-ը վերադարձնել տարբեր պատճառների համար։ UI text-ը `code`-ից locale translation է ընտրում։

## 10. Error code catalog

| Code | HTTP analogue | UI behavior |
|---|---:|---|
| `VALIDATION_FAILED` | 400 | Field/global errors |
| `AUTH_REQUIRED` | 401 | Safe login redirect/reauth |
| `FORBIDDEN` | 403 | Generic access denied |
| `NOT_FOUND` | 404 | Locale not-found or inline missing state |
| `CONFLICT` | 409 | Refresh entity/resolve stale change |
| `OUT_OF_STOCK` | 409 | Item-level availability recovery |
| `COUPON_INVALID` | 422 | Generic eligible explanation ըստ policy |
| `RATE_LIMITED` | 429 | Retry-after, no internal threshold leak |
| `IDEMPOTENCY_CONFLICT` | 409 | Do not resubmit with changed payload/key |
| `PROVIDER_UNAVAILABLE` | 503 | Retry/fallback if safe |
| `INTERNAL_ERROR` | 500 | Correlation ID + safe retry |

Raw database constraint/provider error-ը client չի հասնում։ Expected constraints-ը map են արվում stable codes-ի։

## 11. Authorization matrix

| Resource/action | Guest | Customer | Admin |
|---|---:|---:|---:|
| Public catalog/blog | Read | Read | Read |
| Guest cart | Own token | Merge/own | Own as shopper only |
| Wishlist | Optional guest policy | Own | Own as shopper only |
| Checkout/order create | Own cart | Own cart | Own as shopper only |
| Customer order read | Confirmation-safe own | Own | Any via admin route |
| Review create | No | Own verified purchase | As customer only unless separate moderation action |
| Product/category/hero CRUD | No | No | Yes |
| Order status/payment admin update | No | No | Yes |
| User role/status | No | No | Yes, last-admin guard |
| Settings/analytics/export/audit | No | No | Yes |

Permission-ը ստուգվում է resource query-ի հետ միասին կամ command-ի ներսում՝ TOCTOU window-ը նվազեցնելու համար։

## 12. Cache/revalidation matrix

| Mutation | Next.js tags | Redis keys |
|---|---|---|
| Product publish/update/archive | product ID/slugs, catalog, featured, category relations | product/catalog/analytics relevant namespaces |
| Category update | category ID/slugs, catalog, breadcrumbs | category/catalog namespaces |
| Hero update/reorder | home/hero per locale | hero cache if used |
| Review moderation | product detail/rating | rating aggregates |
| Blog publish/update | blog list/post/sitemap | blog cache if used |
| Promotion/settings update | catalog/product/checkout pricing contexts | promotion/settings namespaces |
| Order/status update | owner order/profile dashboard/admin orders/analytics | analytics/order summary |
| Exchange rate refresh | currency display contexts as designed | exchange-rate namespace |

Invalidation-ը հնարավորինս targeted է; broad global revalidation-ը fallback է, ոչ default։

## 13. Webhook contract

1. Provider-specific raw payload/signature-ը verify է արվում մինչև business mutation։
2. Provider event ID-ն unique insert/claim է արվում։
3. Order/payment reference-ը server-owned mapping-ով է resolve լինում։
4. Amount/currency/status transition-ը verify է արվում expected payment-ի դեմ։
5. Payment event և state/history update-ը transaction-safe են։
6. Duplicate event-ը success/idempotent response է ստանում։
7. Unknown/invalid event-ը safe log + appropriate response է ստանում առանց secret/payload leak-ի։

## 14. Contract acceptance criteria

- [ ] Route list-ը համապատասխանում է functional specification-ին։
- [ ] Յուրաքանչյուր mutation ունի schema, actor, permission, idempotency/transaction և invalidation policy։
- [ ] Query params-ը bounded և server-side parsed են։
- [ ] Error codes-ը translation dictionaries-ում map ունեն։
- [ ] Ownership/admin authorization-ը integration tests ունի։
- [ ] Webhook/upload/export endpoints-ը ունեն առանձին security tests։
