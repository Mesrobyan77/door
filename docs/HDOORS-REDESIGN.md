# Hdoors visual redesign — 2026-11-09

## Architectural entrance revision

The earlier carousel and CSS-built door composition have been superseded by the supplied architectural entrance video. The homepage uses an audio-free, fast-start H.264 derivative with a keyframe every 0.25 seconds. A small `requestAnimationFrame` controller maps native scroll progress to a guarded `0.04s`–`duration - 0.12s` range; it does not intercept wheel/touch input or update React state while scrolling. Pending seeks are coalesced, backward scrolling reverses the footage, and direct showroom/catalog links remain available.

The unmodified 10.03-second source remains outside the repository. Its SHA-256 is `CE3838E7417B468651C559966ADF68320D1F4EB8E5E5338AE88907ECDDC8B6A0`. The hosted derivative is `public/assets/video/hdoors-entrance-scroll.mp4` (1280×720, 24fps, 2.71MB, no audio), accompanied by initial and final JPEG frames. It is not upscaled or persisted in the database.

The sequence is 2.6 viewport heights on desktop and 2.1 on mobile, with the sticky range calculated below the actual header height. Initial/final JPEG fallbacks prevent blank frames; a video-load failure collapses the extended scene, while reduced-motion renders the static opening frame without sticky scroll. The normal-flow order remains entrance, four-product showroom, interior/entrance collection stories with the supported glazed category, brand/about, factual benefits, brands, and footer.

The storefront header is now one light navigation surface containing the logo, navigation, search, language/currency, account, wishlist, and cart controls. The separate dark utility bar is no longer rendered.

The products route now uses the existing filter URL contract in a 280px sticky desktop sidebar. On smaller viewports the same controls render in a focus-trapped side sheet. Search, price/currency, category, availability, sort, page size, active chips, pagination, and real-variant matching behavior remain unchanged.

## Superseded direction

The supplied architectural storefront reference defines the composition: slim dark information bar, light compact navigation, full-width photographic hero, three image-led collections, five featured cards, split story/benefits, and dark footer. The warm canvas `#F7F4F0`, beige `#E9E0D6`, gold `#C69A5B`, dark brown `#29231F`, and warm neutral Tailwind tokens replace the previous cool-gray/teal website palette. Semantic success, warning, and error colors remain distinct.

The owner's follow-up specifically requested **increasing** homepage section heights. Final hero sizing is 440px content plus 56px controls on mobile, 500px on tablet, 560px on desktop, and 620px at the wide breakpoint. Collection cards are at least 220px; homepage product media is square; the story panel is at least 280px. Header controls stay compact.

Noto Sans supplies Latin/Cyrillic and Noto Sans Armenian supplies Armenian. Both are self-hosted by Next/font after build. The design uses fine borders, modest corners, gold focus indicators, reduced-motion handling, and readable responsive type.

## Branding and content

Owner-requested presentation updates: removed the site-wide demo notice/Pexels banner, photographer links, and visible illustrative-image captions from hero, collections, product cards/galleries, and About. Source/permission/photographer records remain stored unchanged for import provenance. Accessibility alt text is retained. The earlier validation notes below describe the original redesign pass.

- Public brand remains Hdoors. Existing `store.identity`, `store.branding.logoObjectKey`, and `store.social` are read by the header/footer. Configured official logo artwork takes precedence and is contained without recoloring, stretching, or cropping.
- The separately requested generated logo is a **new concept**, used only as the fallback when no configured logo resolves. Asset: `public/assets/branding/hdoors-concept-v1.png`. Its exact prompt and built-in-tool provenance are in `hdoors-concept-v1-prompt.txt` beside the image.
- Hero copy/media, collection names/filter destinations, featured products, brand labels, benefits, and story copy remain database-driven. No database reset, import, branch switch, product mutation, price mutation, or stock mutation was performed for the redesign.
- The third collection uses the existing populated glazed category. It does not introduce a new mutually exclusive door classification.
- Pexels images retain their illustrative disclosures, source metadata, photographer/source links on product galleries, and the visible site-level Pexels link. No catalog or hero photography was generated.
- Template sample contacts, generic social URLs, fabricated team biographies, the sample map address, and unsupported 24/7 claims are no longer presented as Hdoors facts. Contact settings can be filled by the owner; the existing contact form remains functional.
- Gallery navigation is omitted because the app has no genuine gallery route. Legal pages retain the localized approval limitation OPEN-014.

## Route checklist

| Surface                                    | Implementation                                                                                                  | Verification boundary                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `/[locale]`                                | New reference composition, taller hero/cards, three collections, five featured cards, CMS story/benefits/brands | Screenshots at 320, 375, 390, 768, 1440, 1920px                            |
| `/[locale]/products`                       | Compact cards, source-aware illustrative labels, dark purchase/details actions, warm filters/pagination         | HY/EN/RU; search and glazed filter; mobile/tablet overflow                 |
| `/[locale]/products/[slug]`                | Gallery attribution, price/action before technical data, separate dimensions/opening/package groups             | HY/EN/RU sample product; gallery and guest add-to-cart                     |
| `/[locale]/wishlist`                       | Shared card design, source labels, unambiguous quick-add rule                                                   | Guest sign-in redirect; signed-in mutations not tested without credentials |
| `/[locale]/cart` and drawer                | Warm cards, localized controls, compact borders, focus trap and Escape                                          | Guest cart action and drawer; existing user carts untouched                |
| `/[locale]/checkout`                       | Warm form controls, modest payment-card corners, gold summary accent                                            | Guest cart/form/COD controls; no order or payment submitted                |
| Checkout confirmation/payment results      | Shared tokens, cards, buttons, typography inherited; lifecycle unchanged                                        | Build/typecheck only; no synthetic order created to reach success          |
| Login/register/forgot/reset/verify         | Shared Hdoors auth panel and localized inputs/states                                                            | HY/EN/RU public rendering; native empty-form validation; no mail sent      |
| Profile/account/orders                     | Shared palette, forms/cards, warm sidebar and avatar                                                            | Protected route behavior preserved; signed-in screenshots unavailable      |
| About/contact/blog/legal                   | CMS-backed factual About; configured contacts; matching content panels and empty states                         | HY/EN/RU public routes                                                     |
| Loading/error/not-found/maintenance        | Shared tokens/skeletons, localized new error and 404 surfaces                                                   | Build and public draft hiding; no forced live server outage                |
| Admin layouts/tables/forms/drawers/dialogs | Compact shared warm theme and Hdoors navigation identity                                                        | Build/typecheck; authenticated admin browser session unavailable           |

## Runtime/catalog cache correction

The running application was checked directly with a temporary local development diagnostic, then that diagnostic route was removed. PID 14312 was serving port 3000 from `C:\Users\khachik.mesrobyan\Desktop\s`; its DB URL matched `.env.local`, not `.env`, and resolved to `ep-ancient-poetry-bdwveofc-pooler…/neondb`. Direct application SQL returned 30 products, 29 ACTIVE, 1 DRAFT, three active hero slides, and ten categories. The English persisted Next read model had returned 39 cards while the database had 29 active products.

Public product-page, product-detail, featured-product, and hero cache keys now include a credential-free database endpoint/database scope. Direct and pooled connections share a scope; different Neon branches cannot reuse each other's read models. Existing cache tags and mutation invalidation remain intact. The new scope also versions the media-attribution DTO. Unit coverage verifies branch isolation and omission of credentials.

## Validation and limitations

Final checks passed: `pnpm typecheck`, `pnpm lint`, `pnpm test` (46 files / 143 tests), and `pnpm build`. The final production-mode local browser pass covered 58 route/viewport states with zero JavaScript exceptions. All three locale catalogs rendered 29 cards and the Event 1 draft remained hidden. Search, the six-product glazed filter, gallery selection, guest add-to-cart, dialog focus/Escape, checkout contact/COD controls, guest wishlist redirect, and native empty-form validation passed. No checkout submission was made; the test cart line was removed using the app's normal UI.

Screenshots: [desktop homepage](../artifacts/hdoors-redesign/home-hy-1440.png), [full homepage](../artifacts/hdoors-redesign/home-hy-full.png), [390px mobile](../artifacts/hdoors-redesign/home-hy-390.png), and [browser report](../artifacts/hdoors-redesign/report.json). The temporary verification server used `localhost:3100`; it was stopped after verification. The user's live development URL remains `http://localhost:3000/hy`.

The browser harness is `scripts/verify-hdoors-design.mjs`; its screenshots and JSON reports are generated under `artifacts/hdoors-redesign/`. Browser profiles stay in ignored `.next/` output. It exercises responsive pages, search/filter, gallery, a guest cart, checkout controls, wishlist guest redirect, and native form validation without placing orders or initiating notifications/payments.

An initial build hit local resource exhaustion while C: had no free space. Only the verified generated Turbopack compiler cache and four zero-byte optimized-image cache files were removed; original media, database data, and source files were preserved. After space was recovered, the optimized build passed. No reset/import was used to resolve the runtime issue.

No authenticated admin/customer credentials were configured for the browser session. Their UI uses the same tokens/components and the compact admin/profile changes, but their signed-in screens are not claimed as visually verified. Real provider callbacks and recovery delivery remain subject to the existing payment/security contracts. Exact-model photography permission gaps and demo-data release gates remain unchanged.
