# White Shop — security and privacy specification

**Կարգավիճակ.** Draft security baseline
**Թիրախ.** OWASP-aligned controls, least privilege, privacy by design
**Վերջին թարմացում.** 2026-07-17

## 1. Security objectives

1. Կանխել account takeover, privilege escalation և unauthorized data access։
2. Պաշտպանել order/payment/stock integrity-ն replay, concurrency և tampering-ից։
3. Կանխել XSS, injection, CSRF, malicious upload և secret leakage։
4. Պահպանել auditability՝ առանց logs/audit-ում secrets կամ ավելորդ PII գրելու։
5. External provider outage/compromise-ը սահմանափակել adapter, least privilege և verification controls-ով։

## 2. Trust boundaries և հիմնական threats

| Boundary | Threats | Պարտադիր controls |
|---|---|---|
| Browser → Next.js | Tampering, CSRF, XSS, bot abuse | Zod, same-origin/CSRF policy, secure cookies, output encoding, rate limits |
| Guest token/cart | Guessing, fixation, cross-user access | Random opaque tokens, hash at rest, rotation/expiry, ownership scoping |
| Customer → own resources | IDOR/BOLA | Query-level ownership checks, non-enumerable IDs, safe errors |
| Admin surface | Privilege escalation, destructive mistakes | Server RBAC, re-auth for high risk, confirmation, audit, last-admin invariant |
| App → PostgreSQL | SQL injection, excessive privilege, data loss | Parameterized Drizzle queries, non-owner app role, timeouts, migrations |
| App → Redis | Secret leakage, cache poisoning | Server-only credential, namespaced keys, TTL, no durable commerce authority, minimal token metadata |
| App/browser → R2 | Malicious files, overwrite, secret exposure | Presigned scoped upload, key ownership, MIME/size validation, metadata verify |
| Provider webhooks | Forgery, replay, duplicate processing | Signature, timestamp policy, event unique key, state/amount verification |
| Logs/analytics | PII/token leakage | Structured allowlist, redaction, retention/access policy |

## 3. Authentication controls

- Password hash՝ Argon2id with unique salt; parameters benchmark են target runtime-ում և versioned rehash policy ունեն։
- Password rules-ը server-side enforced են; maximum safe length նույնպես սահմանվում է DoS-ից խուսափելու համար։
- Email normalization-ը consistent է registration/login/reset բոլոր flows-ում։
- Login, forgot/reset և verification responses-ը չեն բացահայտում account գոյությունը։
- Verification/reset raw token-ը random high entropy է, URL-ում միայն օգտագործման պահին է, իսկ Upstash Redis-ում միայն hash + purpose + TTL է պահվում։
- Tokens-ը purpose-bound, expiring, single-use և revokeable են։
- Redis token consume-ը atomic է; Redis loss-ի դեպքում token-ը reissue է արվում և durable account/order data չի կորչում։
- Session cookie՝ `httpOnly`, `secure` production-ում, `sameSite=lax/strict` ըստ Auth flow-ի, explicit path/expiry։
- Session ID-ն rotate է արվում login/privilege-sensitive events-ի ժամանակ։
- Password change/reset, account suspension/anonymization-ը revoke են անում relevant sessions-ը։
- High-risk admin actions-ի համար re-authentication ավելացվում է՝ եթե risk review-ը պահանջի։

## 4. Authorization controls

- Middleware/proxy redirect-ը UX optimization է, ոչ միակ security control։
- Յուրաքանչյուր protected Server Component query, Action և Route Handler ստուգում է active session/role/ownership-ը server-side։
- Resource ID ստանալը permission չէ. query-ն scope է լինում current user/tenant-like owner-ով։
- Admin role change, account suspension, financial status, settings, export և media mutation-ները explicit policy functions ունեն։
- Last active admin-ը չի կարող demote/suspend/delete անել իրեն կամ թողնել համակարգն առանց active admin-ի; concurrent admin mutations-ը serialized/locked են։
- UI hide-ը միայն presentation է և չի փոխարինում policy enforcement-ին։

## 5. Input validation և injection protection

- Zod schema-ն սահմանվում է յուրաքանչյուր form, search param, action, webhook, env և provider-normalization boundary-ի համար։
- Unknown fields-ը strip/reject են ըստ contract-ի; mass assignment չի թույլատրվում։
- Drizzle parameterized queries են օգտագործվում։ Raw SQL-ը միայն static fragments/parameter binding-ով և review-ով։
- Sort column/direction, table/column identifiers և filters-ը allowlist են, ոչ user string interpolation։
- CSV export cells-ը neutralize են լինում `=`, `+`, `-`, `@` formula injection-ից։
- URL fields-ը protocol/origin policy ունեն (`https`, locale internal paths), `javascript:` և unsafe schemes արգելվում են։

## 6. CSRF և request integrity

- Cookie-authenticated mutations-ը օգտագործում են Auth.js/Next.js supported same-origin protections և explicit Origin/Host validation այնտեղ, որտեղ պետք է։
- State-changing operation-ը GET route չի օգտագործում։
- Route Handler mutation-ների համար documented CSRF token կամ strict same-origin strategy է կիրառվում։
- Payment webhook-ը CSRF flow-ի մաս չէ; այն provider signature և replay controls ունի։
- Checkout ունի idempotency key + request fingerprint; նույն key/այլ payload-ը conflict է։

## 7. XSS և content security

- React escaped rendering default է; `dangerouslySetInnerHTML` միայն centralized sanitized rich-content component-ում։
- Blog rich text-ը sanitize է արվում server-side allowlist-ով ստեղծելիս/թարմացնելիս և ցանկալի է կրկին անվտանգ render boundary-ով։
- User review/contact/admin notes-ը plain text է, ոչ HTML։
- Image alt text-ը escaped text է։
- CSP-ը սկսվում է report-only inventory-ից, ապա enforce է արվում hosting/provider allowlist-ով։ Inline script/style exceptions-ը նվազագույն են և documented։
- Open Graph/JSON-LD serialization-ը անվտանգ encoder է օգտագործում՝ script break-out-ից խուսափելու համար։

## 8. Rate limiting և abuse prevention

Rate limit policy-ն config-driven է և ունի environment + endpoint + identity key։ Exact thresholds-ը load/abuse test-ից հետո lock են արվում։

| Risk group | Key strategy | Additional control |
|---|---|---|
| Login/register/reset/verify | hashed IP + normalized identity bucket | Generic errors, progressive cooldown |
| Contact/review | user or hashed IP | Honeypot, content length/spam signals |
| Cart/wishlist | user/guest token | Higher burst, DB constraints |
| Coupon preview | user/cart + code hash | Prevent code enumeration |
| Checkout/order | user/cart + idempotency | Strict burst, DB uniqueness |
| Upload intent/finalize | admin user + IP | Purpose/MIME/size quota |
| Admin exports/analytics | admin user | Bounded range/page size |
| Webhooks | provider/source policy | Signature/idempotency is primary |

Redis unavailable լինելու դեպքում high-risk endpoints-ը fail-closed կամ degraded policy են պահանջում; exact behavior-ը endpoint risk review-ով է։

## 9. Order, payment և stock integrity

- Client subtotal/discount/delivery/tax/total/stock/role fields-ը authoritative input չեն։
- Checkout-ը transaction-ում re-read/lock կամ atomic conditional update է անում inventory-ն։
- Stock never-negative constraint/policy և movement ledger նույն transaction-ում են։
- Coupon usage limits-ը concurrency-safe են; preview-ը redemption reservation չէ։
- Order/idempotency unique constraints-ը duplicate row-ից վերջնական պաշտպանությունն են։
- Payment callback-ը ստուգում է signature, event uniqueness, merchant/order reference, expected amount/currency և allowed transition-ը։
- Admin payment change-ը audit trail ունի և չի ջնջում provider history-ը։
- Financial records-ը hard delete չեն արվում; corrections-ը status/event/adjustment records են։

## 10. File upload/R2 security

- Client-ը երբեք չի ստանում R2 access key/secret։
- Upload intent-ը server-side authorize է անում entity purpose-ը և սահմանում է unique exact object key, MIME, size, expiry։
- Extension-ը վստահելի չէ; finalize-ը ստուգում է object metadata/MIME և հնարավորության դեպքում image decode/dimensions։
- Allowed image types-ը allowlist են; SVG-ը default արգելված է կամ sanitize/separate delivery policy է պահանջում։
- File size/dimension limits-ը purpose-specific են։
- Object key-ը չի պարունակում untrusted path traversal կամ PII։
- Public bucket policy-ն write չի թույլատրում; delivery domain-ը config-controlled է։
- Replaced asset-ը delete չի արվում մինչև DB commit; orphan cleanup-ը audit/retry-safe է։

## 11. Secrets և environment security

- `.env.example`-ը միայն names է պարունակում, ոչ իրական values։
- Environment-ը startup-ում server-side Zod schema-ով validate է արվում։
- `DATABASE_URL`, `AUTH_SECRET`, Redis write token, R2 credentials և provider secrets-ը server-only են։
- `NEXT_PUBLIC_*` prefix-ը օգտագործվում է միայն դիտավորյալ public config-ի համար։
- Secrets-ը logs, errors, audit diff, analytics, source maps կամ client bundle չեն մտնում։
- Production/preview/local credentials-ը տարբեր են և least-privilege scopes ունեն։
- Rotation/runbook-ը սահմանվում է Auth, DB, Redis, R2, email և payment secret-ների համար։

## 12. Database security

- Application-ը production-ում database owner/superuser չի օգտագործում։
- Migration role և runtime app role-ը բաժանված են, եթե Neon setup-ը թույլ է տալիս։
- TLS connection-ը enforced է provider-supported config-ով։
- Connection pool/statement/lock/idle-in-transaction timeouts-ը սահմանվում են runtime capacity-ից հետո։
- Schema migrations-ը reviewed artifacts են; production auto-sync/push չկա։
- Backups/PITR availability-ն բավարար չէ առանց restore drill-ի և documented RPO/RTO-ի։
- Seed-ը production default admin password չի ստեղծում։

## 13. Security headers և edge controls

Առաջարկվող baseline՝

- HSTS production domain-ի համար՝ rollout-ից հետո։
- CSP with provider-specific allowlist։
- `X-Content-Type-Options: nosniff`։
- Strict `Referrer-Policy`։
- `Permissions-Policy`՝ չօգտագործվող browser capabilities-ի արգելում։
- Frame embedding protection (`frame-ancestors`)։
- HTTPS redirect և secure canonical host։
- Cloudflare/hosting WAF rules՝ measured false-positive monitoring-ով։

## 14. Audit logging

Audit-required events՝

- Admin login/security-relevant failure signals
- Product/category/hero/blog publish/archive/delete
- Stock adjustment
- Order/payment/status/admin note changes
- Coupon/discount/delivery/settings changes
- User role/status change և account anonymization
- Export requests և high-risk upload operations

Audit row-ը ներառում է actor, action, target, safe before/after diff, timestamp, correlation ID և optional policy-compliant request context։ Password/token/secret/full payment payload/irrelevant PII չի ներառվում։ Audit logs-ը immutable և admin UI-ում least-privilege readable են։

## 15. Privacy և retention

- Collect միայն checkout, fulfillment, legal և support-ի համար անհրաժեշտ PII։
- Privacy policy-ն նշում է data categories, purposes, processors, retention, rights և contact point։
- Account deletion-ը anonymize է անում profile/session/address/wishlist/cart data-ն, բայց legal financial snapshots-ը պահպանում է approved period-ով։
- Order snapshot contact/address-ի access-ը սահմանափակվում է admin need-to-know-ով։
- Analytics logs-ում email/phone/address/raw token չի գրվում։
- IP/user-agent retention-ը documented և minimised է։
- Data export/erasure request process-ը պետք է սահմանվի մինչև production launch։

## 16. Error handling և observability

- Client-ը ստանում է safe stable code + correlation ID, ոչ stack trace/SQL/provider payload։
- Server log-ը structured է, severity/correlation/request/actor-safe ID-ով և redaction-ով։
- Alerts՝ auth anomaly, checkout failure spike, webhook signature failures, stock conflicts, DB/Redis/provider availability, migration errors։
- Health endpoint-ը secrets/dependency internals չի արտահոսում։
- Error tracking provider-ին ուղարկվող payload-ը PII scrubber ունի։

## 17. Dependency և CI security

- Lockfile committed և CI install frozen է։
- Dependabot/dependency scanning enabled է; critical vulnerability-ն չի շրջանցվում check disable-ով։
- CI secret-ը PR/fork context-ում չի արտահոսում։
- Build/typecheck/lint/tests failures-ը չեն hide/ignore արվում։
- Package install scripts և high-risk dependency changes-ը review են ստանում։

## 18. Security verification matrix

| Control | Verification |
|---|---|
| Auth enumeration | Integration tests compare public response semantics |
| IDOR/BOLA | Cross-user profile/order/address tests |
| RBAC | Customer-to-admin route/action denial tests |
| CSRF/origin | Negative Route Handler/Action tests where applicable |
| XSS | Sanitizer unit tests + payload E2E for blog/review/contact |
| SQL injection | Schema/allowlist tests; no interpolated identifiers from input |
| Rate limiting | Boundary/retry-after tests and Redis failure policy |
| Upload | MIME/size/purpose/ownership/finalize negative tests |
| Checkout replay | Duplicate key same/different payload tests |
| Stock race | Concurrent integration test, no negative/oversell |
| Coupon race | Concurrent usage-limit test |
| Payment webhook | Invalid signature, duplicate event, wrong amount/status tests |
| Last admin | Concurrent demotion/suspension tests |
| Secret leakage | Client bundle/env/log review |

## 19. Launch security gate

- [ ] Threat model-ը վերանայված է final payment/hosting architecture-ից հետո։
- [ ] Security headers/CSP-ը verified են staging-ում։
- [ ] Auth/RBAC/IDOR/rate-limit/upload/checkout/webhook negative tests անցնում են։
- [ ] Production app DB role-ը owner չէ և timeouts-ը սահմանված են։
- [ ] Secret inventory/rotation owner-ները documented են։
- [ ] Backup restore drill և incident response contacts կան։
- [ ] Privacy/legal/retention policies approved են։
- [ ] Audit coverage-ը համապատասխանում է admin mutation matrix-ին։

Repository security references-ը գտնվում են [`reference/Check/Security`](./reference/Check/Security/) պանակում և կիրառվում են implementation review-ի ժամանակ։
