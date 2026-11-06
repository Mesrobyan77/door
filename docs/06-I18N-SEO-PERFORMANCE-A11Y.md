# White Shop — i18n, currency, SEO, performance and accessibility

**Կարգավիճակ.** Draft
**Տարբերակ.** 1.0
**Վերջին թարմացում.** 2026-07-18

## 1. Locale model

- Supported locales՝ `hy`, `en`, `ru`; default՝ `hy`։
- Canonical public URL-ը միշտ locale segment ունի՝ `/hy/products`, `/en/products`, `/ru/products`։
- `/`-ը redirect է անում saved preference/accepted language/default `hy` policy-ով։ Redirect-ը չի ստեղծում duplicate canonical page։
- Unsupported locale-ը safe redirect կամ not-found է ըստ route policy-ի, ոչ implicit data leak։
- Locale preference-ը cookie-ում կարող է պահվել, բայց URL-ը route source of truth է։

## 2. Translation file contract

```text
locales/
  hy/
    common.json
    home.json
    contact.json
    about.json
    auth.json
    profile.json
    checkout.json
    cart.json
    product.json
    blog.json
    catalog.json
    wishlist.json
  en/
    ...same namespaces
  ru/
    ...same namespaces
```

- Key structure-ը semantic է (`checkout.errors.outOfStock`), ոչ source sentence-as-key։
- Namespace/key parity-ն `hy/en/ru`-ի միջև CI check ունի։
- Missing key-ը development-ում visible failure է, production-ում controlled fallback + telemetry; launch namespaces-ում missing keys չեն թույլատրվում։
- UI component-ում hardcoded visible copy չկա, ներառյալ aria labels, toast, validation, empty/error states և email templates։
- Dates, times, lists, pluralization և numbers-ը locale-aware formatter են օգտագործում։ String concatenation-ի փոխարեն ամբողջ message template է թարգմանվում։
- Translation value-ի մեջ raw unsanitized HTML default արգելված է։

## 3. Database translation model

- Product, category, hero և blog admin-managed translations-ը պահվում են համապատասխան parent table-ի versioned `translations JSONB` դաշտում։ Առանձին translation tables չկան canonical 25-table schema-ում։
- JSON structure-ը entity-specific Zod schema ունի; `hy`/`en`/`ru` keys-ը optional են (partial translations թույլատրված են՝ `DEC-017`)։
- Slug-ը unique է per locale/entity namespace՝ PostgreSQL expression unique indexes-ով (`translations->'hy'->>'slug'` և այլն) միայն առկա locale keys-ի համար։
- Public publish command-ը ստուգում է առնվազն մեկ լրիվ locale-ի completeness-ը, ոչ բոլոր երեք locale-ները։
- Locale translation բացակայելու դեպքում այդ լեզվի storefront-ում product/entity-ը չի ցուցադրվում (ոչ silent cross-locale content leak). fallback policy-ն entity type-ով explicit է։
- Slug change-ը redirect-history model է պահանջում, եթե SEO continuity-ն launch requirement է; հակառակ դեպքում հին URL-ը 404 է։

### 3.1 Admin content editing UX (`DEC-017`)

- Admin create/edit forms-ը (product, category, hero, blog) ցուցադրում են **մեկ** դաշտերի հավաքածու՝ Title, Slug, Description և այլ locale-bound fields — ինչպես single-language Basic Information form։
- Active locale-ը ընտրվում է selector/tabs control-ով; selector փոխելիս նույն դաշտերում բեռնվում/պահվում է այդ locale-ի JSONB entry-ն։
- Զուգահեռ `hy` + `en` + `ru` դաշտեր նույն էջում չեն ցուցադրվում։
- Admin-ը կարող է լրացնել միայն այն լեզուները, որոնք պետք են; մյուսները դատարկ են մնում մինչև հետագա edit։

## 4. Locale switch behavior

1. Parse current locale-aware route և route params/search params։
2. Entity route-ի դեպքում resolve անել target locale slug-ը entity ID-ով։
3. Պահպանել թույլատրելի query params-ը (catalog filters, pagination policy)։
4. Եթե target translation չկա, fallback անել target locale parent/list կամ home՝ visible explanation-ով ըստ UX-ի։
5. Navigate Next.js router/`Link`-ով, no full reload։

## 5. Currency model

### 5.1 Core rules

- Base currency՝ AMD։ Supported display currencies՝ AMD, USD, EUR, RUB։
- Database catalog price-ը AMD integer amount է։ Currency dropdown-ը այդ արժեքը չի mutate անում։
- Rate model-ը base-relative է (`1 AMD → quote` կամ հակառակը), direction-ը contract-ում միանշանակ է։
- Rate-ը fixed-precision decimal է, conversion-ը centralized money library-ով է և յուրաքանչյուր target currency-ի rounding rule ունի։
- Selected currency-ն cookie/user preference է; URL query default չէ՝ duplicate SEO URLs-ից խուսափելու համար։
- Order-ը snapshot է անում checkout currency, base currency, rate, rate source/effective time և բոլոր summary amounts-ը։

### 5.2 Exchange-rate service

```ts
interface ExchangeRateProvider {
  getRates(input: {
    base: "AMD";
    quotes: readonly ("USD" | "EUR" | "RUB")[];
  }): Promise<RateSnapshot>;
}
```

- Redis cache-ը versioned key/TTL ունի։
- Provider unavailable լինելու դեպքում approved last-known snapshot կամ AMD-only fallback է; stale state-ը checkout policy-ով visible/blocked է։
- Rate source, refresh cadence, allowed staleness և merchant rounding/margin-ը `OPEN-003` են։
- Catalog և checkout-ը նույն effective rate policy-ն օգտագործում են, բայց final order transaction-ը կրկին snapshot է անում rate-ը։

### 5.3 Money display

- `Intl.NumberFormat` locale + currency settings են օգտագործվում։
- Discount percentage/compare-at display-ը authoritative integer amounts-ից է հաշվարկվում, divide-by-zero guard-ով։
- Screen reader label-ը պարունակում է final price և, եթե պետք է, original price meaning-ը։
- UI-ում arithmetic չի կատարվում raw float-երով։

## 6. SEO route/content requirements

| Surface | Required metadata |
|---|---|
| Home | locale title/description, canonical, hreflang, OG |
| Catalog | normalized filter canonical policy, optional noindex for low-value combinations |
| Product | translated title/description, canonical locale slug, hreflang available translations, Product JSON-LD, OG image |
| Blog list/post | canonical/hreflang, BlogPosting JSON-LD post-ի համար, OG |
| Policies/About/Contact | canonical/hreflang և meaningful metadata |
| Profile/Admin/Auth/Cart/Checkout | `noindex` where appropriate; sensitive routes sitemap-ում չկան |

### 6.1 Canonical և filter policy

- Currency/user preference-ը canonical URL չի փոխում։
- Catalog filters-ը shareable են, բայց crawl/index policy-ն explicit է՝ base catalog canonical կամ curated filter pages only։
- Pagination canonical/prev-next behavior-ը current search engine guidance-ի և product SEO strategy-ի համաձայն lock է արվում։
- Tracking params-ը canonical-ից դուրս են մնում։

### 6.2 hreflang

- `hy`, `en`, `ru` alternates միայն գոյություն ունեցող equivalent content-ի համար։
- Optional `x-default`-ը կարող է ցույց տալ `/hy` կամ locale selector policy-ին։
- Product/blog alternate URL-ը target locale slug-ն է, ոչ միայն segment replacement։

### 6.3 Structured data

- Product JSON-LD՝ name, image, description, SKU, brand եթե կա, offers price/currency/availability, aggregateRating միայն approved data-ի դեպքում։
- Breadcrumb JSON-LD՝ locale labels/URLs։
- BlogPosting JSON-LD՝ headline, dates, author, image, canonical։
- JSON-LD-ը render է արվում safe serialized data-ից և համապատասխանում է visible page content-ին։ Fake reviews/availability/prices արգելված են։

### 6.4 Sitemap և robots

- Sitemap-ը ներառում է published canonical locale pages/products/blog posts և relevant last-modified timestamps։
- Draft/archived/auth/profile/admin/cart/checkout/search-combination pages-ը sitemap-ում չեն։
- Preview/staging environments-ը crawler-blocked են և production canonical domain չեն գովազդում։
- `robots.txt`-ը security boundary չէ. sensitive data-ն auth-ով է պաշտպանվում։

## 7. Image և font performance

- `next/image` օգտագործվում է ճիշտ width/height կամ fill + sizes contract-ով։
- Hero LCP image-ը priority/preload է միայն երբ իրական LCP candidate է; offscreen images lazy-load են։
- Mobile/desktop hero assets-ը art-directed են, ոչ միաժամանակ անիմաստ download։
- Product grid image `sizes`-ը համապատասխանում է 2/3/4 column layout-ին։
- Transparent assets-ը preserve են անում alpha-ն և theme-aware background ունեն։
- R2 delivery domain-ը Next image allowlist-ում է; cache headers/versioned keys policy կա։
- Fonts-ը Next.js font optimization/self-host strategy-ով են, նվազագույն weights/subsets-ով։ Armenian glyph coverage-ը launch-ից առաջ ստուգվում է։

## 8. Rendering, streaming և caching performance

- RSC default՝ client JS-ը նվազեցնելու համար։
- `loading.tsx`, Suspense boundaries և feature skeleton-ները stream են անում meaningful shell/sections։
- `error.tsx` retry boundary-ն client-safe է և չի կորցնում արդեն պահպանված data-ն։
- Public reads-ը tag-based cache/revalidation ունեն; authenticated/checkout data-ն shared public cache չի մտնում։
- N+1 query-ները կանխվում են joined/batched read models-ով։
- Catalog pagination server-side է; admin tables-ը bounded են։
- Product link prefetch-ը selective է. հարյուրավոր cards default eager prefetch չեն անում։ Header/high-intent links-ը կարող են prefetch լինել։
- TanStack Query-ը չի կրկնօրինակում RSC տվյալները առանց interaction/revalidation հիմնավորման։

## 9. Performance budgets

Target production 75th percentile՝

| Metric | Target |
|---|---:|
| LCP | < 2.5 s |
| CLS | < 0.1 |
| INP | < 200 ms |

Implementation kickoff-ին լրացուցիչ budgets են սահմանվում՝ initial route JS per surface, hero/product media bytes, server query p95 և checkout command p95։ Exact budgets-ը չափվում են target hosting/region/device/network profiles-ով։

Regression checks՝ bundle analysis critical routes-ի համար, Lighthouse/Playwright smoke, real-user metrics provider approval-ից հետո։ Lab score-ը միակ acceptance metric-ը չէ։

## 10. Responsive layout contract

QA viewport classes՝ small mobile, mobile, tablet, laptop, desktop, wide desktop։ Exact Tailwind breakpoint values-ը design approval-ում lock են արվում։

- No horizontal page overflow at 320px width։
- Product grid՝ 2 mobile, 3 laptop, 4 wide desktop; card content readable է։
- Catalog filters mobile drawer են՝ applied/cancel behavior-ով։
- Admin sidebar mobile drawer, editors full-screen sheet; desktop collapsible/sidebar։
- Tables mobile-ում cards կամ intentional scroll region ունեն՝ headers/context պահպանելով։
- Touch target recommended minimum 44×44 CSS px և բավարար spacing։
- Sticky actions չեն ծածկում form fields/toasts/OS safe areas։

## 11. Accessibility baseline

Target՝ WCAG 2.2 AA where applicable։

### Keyboard/focus

- Բոլոր actions հասանելի են keyboard-ով և ունեն visible focus։
- Dialog/drawer/menu ունի correct trigger semantics, focus trap, Escape close where safe, initial focus և focus restore։
- Destructive unsaved/processing state-ը accidental close չի թողնում առանց warning-ի։
- Skip link և semantic landmarks կան storefront/admin shell-ում։

### Forms

- Visible label կամ programmatic accessible name յուրաքանչյուր control-ի համար։
- Required/help/error state-ը `aria-describedby`/appropriate semantics-ով է կապված field-ին։
- Error summary-ն focusable է complex form-ի համար և field focus navigation ունի ըստ անհրաժեշտության։
- Submit pending state-ը announced է; disabled control-ի պատճառը հասկանալի է։

### Dynamic UI

- Cart count/toast/status changes-ը չափավոր live region են, առանց duplicate announcements-ի։
- Carousel-ը pause/control semantics ունի, auto-rotation-ը reduced motion/interaction policy է հարգում։
- Star rating-ը keyboard-operable radio-group semantics ունի։
- Sortable/reorder UI-ն ունի non-pointer alternative։

### Visual/content

- Text/background և control contrast-ը AA է; color-ը միակ status indicator չէ։
- Product availability/discount/order status-ը ունեն text label։
- Images meaningful alt text ունեն; decorative images empty alt։
- Heading hierarchy-ը logical է, locale change-ից հետո `<html lang>` ճիշտ է։
- Armenian/Russian/English text-ը չի truncate անում critical content-ը fixed-height containers-ում։

## 12. Required page states

Յուրաքանչյուր route/section սահմանում է՝

- Initial/streaming skeleton (չի առաջացնում մեծ CLS)
- Empty state with relevant next action
- Recoverable error + retry
- Not-found/unauthorized behavior
- Offline/provider unavailable message where applicable
- Mutation pending, field/global error և success feedback

Skeleton-ը approximate final geometry ունի և inaccessible duplicate content չի ստեղծում։

## 13. Verification checklist

- [ ] Locale route, switch և target-locale slug mapping-ը E2E test ունի։
- [ ] Translation namespace parity և no-hardcoded-visible-copy check-ը CI-ում է։
- [ ] Currency conversion/rounding/rate snapshot-ը unit/integration tested է։
- [ ] Canonical/hreflang/sitemap/robots/JSON-LD-ը representative pages-ում verified են։
- [ ] Product/hero images-ը ճիշտ responsive `sizes` և mobile art direction ունեն։
- [ ] Core routes-ի client JS/bundle և CWV budgets-ը չափված են։
- [ ] Critical customer/admin flows-ը keyboard-only անցնում են։
- [ ] Automated accessibility smoke + manual focus/dialog/table/carousel review անցնում են։
- [ ] Small mobile-ից wide desktop no-overflow visual regression coverage կա։
