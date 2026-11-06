# FastShift — ինտեգրացիայի ձեռնարկ

> Այս փաստաթուղթը նախատեսված է **FastShift** (e-wallet / vPOS) միացման համար։ Register order → redirect_url → callback/webhook։
>
> **Պաշտոնական API.** `payment integration/| Official doc for the API integrationm/FastShift/PayByFastShift (vers25.02.25).md` — Pay by FastShift v1.0. Իրականացումը համապատասխանում է այդ փաստաթղթին (Register order API, callback params `status` + `order_number`, response `data.redirect_url`, `data.order`).

---

## 0. Համապատասխանություն պաշտոնական PayByFastShift (vers25.02.25).md

| Փաստաթղթի պահանջ | Մեր իրականացում |
|--------------------|------------------|
| URL `https://merchants.fastshift.am/api/en/vpos/order/register` | ✓ `FASTSHIFT_REGISTER_URL` |
| Method POST, Header `Authorization: Bearer {Token}`, `Content-Type: application/json` | ✓ `client.ts` registerOrder |
| `order_number` — **guid**, required | ✓ UUID v4 `generateFastshiftOrderGuid()` |
| `amount` — unsigned int, required | ✓ `Math.round(total)` |
| `description` — string, required | ✓ `Order ${order.number}` |
| `callback_url` — string, required; callback-ում փոխանցվում են `status` և `order_number` | ✓ URL + query `?order=...`; handler ընդունում է `status`, `order_number` (և `order` մեր նույնացման համար) |
| `webhook_url` — optional; params `status`, `order_number` | ✓ նույն URL, POST handler |
| `external_order_id` — optional, merchant order id | ✓ `order.id` |
| Success response `data.redirect_url`, `data.order.order_number` | ✓ redirectUrl; providerTransactionId |
| Callback params: `status`, `order_number` (guid) | ✓ handleFastshiftResponse; order by `order` (URL) or by Payment.providerTransactionId = order_number |
| Order status `completed` = success; `rejected`, `expired` = fail | ✓ FASTSHIFT_STATUS_SUCCESS includes `completed` |

**Անվտանգություն.** Callback-ում status-ը **ստուգվում է FastShift API-ով** (GET `/vpos/order/status/{order_number}`). Եթե API-ն պատասխանում է — օգտագործվում է API-ի status-ը (source of truth); հակառակ դեպքում fallback callback params-ի վրա։ Idempotency: եթե order արդեն paid — կրկնակի callback-ը չի փոխում state։ order_number (GUID) վալիդացվում է UUID ֆորմատով։ Webhook/GET սխալի դեպքում պատասխանում ենք 400/redirect առանց ներքին սխալի տեքստի արտահոսքի։

---

## 1. Ընդհանուր

- **Պրոտոկոլ.** Վճարումը սկսվում է **POST register** order FastShift API-ում (Bearer token), պատասխանից `redirect_url` — օգտատիրոջ redirect։ Callback — **callback_url** (user redirect, GET) և/կամ **webhook_url** (server POST).
- **Կապ.** FastShift-ից ստանում եք Bearer **Token** (test և live); IP whitelist — server-ի исходящий IP (Vercel-ում կարող է փոխվել).
- **Արտարժույթ.** AMD (ըստ պլանի).

### 1.1 API

| Էնդպոյնտ | URL |
|----------|-----|
| **Register order** | `https://merchants.fastshift.am/api/en/vpos/order/register` |

Test/live — նույն host; տարբերությունը **token**-ի արժեքն է (FASTSHIFT_TOKEN / FASTSHIFT_LIVE_TOKEN).

---

## 2. Environment variables

```env
# --- FastShift ---
FASTSHIFT_TEST_MODE=true
FASTSHIFT_TOKEN=
FASTSHIFT_LIVE_TOKEN=
APP_URL=https://yoursite.com
```

- **Test.** `FASTSHIFT_TEST_MODE=true` → FASTSHIFT_TOKEN.
- **Live.** FASTSHIFT_LIVE_TOKEN.

---

## 3. Callback URL

FastShift-ում (register request-ում) փոխանցվում են.

| Պարամետր | URL |
|----------|-----|
| **callback_url** | `https://yoursite.com/api/v1/payments/fastshift/callback` |
| **webhook_url** (optional) | `https://yoursite.com/api/v1/payments/fastshift/callback` |

Իրականացումում երկուսն էլ ուղարկվում են նույն URL-ին (GET — user redirect, POST — webhook).

---

## 4. Ինտեգրացիայի հոսք

1. Order + Payment (provider: `fastshift`, status: `pending`), currency = AMD.
2. **Register order** — POST `/api/en/vpos/order/register`, header `Authorization: Bearer {Token}`, body: `order_number`, `amount`, `description`, `callback_url`, `webhook_url`, `external_order_id`.
3. Պատասխան → `data.redirect_url` (կամ `redirect_url`) — redirect օգտատիրոջ։
4. **callback_url** — FastShift redirects user GET with `status`, `order_number`. Handler թարմացնում է order/payment, redirect → `/checkout/success?order=...` (success) կամ `/checkout?order=...` (fail).
5. **webhook_url** — FastShift POST (JSON/form) with `status`, `order_number`. Նույն handler, պատասխան 200.

---

## 5. Register request (POST)

**Headers.** `Authorization: Bearer {Token}`, `Content-Type: application/json`.

**Body (JSON).**

| Դաշտ | Նկարագրություն |
|------|------------------|
| order_number | **GUID/UUID** (օր. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`) — FastShift-ը սպասում է unique identifier, ոչ թե մեր պատվերի համարը. տես `generateFastshiftOrderGuid()` |
| amount | Գումար (ամբողջ թիվ, Math.round(total)) |
| description | Օր. "Order 260218-12345" |
| callback_url | Full URL — user redirect after payment; URL-ում պետք է ունենալ մեր order, օր. `...?order=260218-12345` |
| webhook_url | Full URL — server-to-server (optional) |
| external_order_id | Order id (optional) |

**Response.** `{ data: { redirect_url: "https://..." } }` կամ `{ redirect_url: "https://..." }`.

---

## 6. Callback / Webhook params

**Պարամետրներ.** `status`; պատվերի նույնացում. 1) **order** (query-ից — մեր callback_url-ում ուղարկած, օր. `order=260218-12345`), 2) **order_number** (GUID) — գտնում ենք Payment.providerTransactionId-ով. Հնարավոր են լրացուցիչ դաշտեր (transaction_id, payment_id և այլն).

**Success status.** Պաշտոնական փաստաթղթում order status-ը՝ `completed` = հաջող վճարում; `rejected`, `expired` = ձախողում։ Callback-ում FastShift փոխանցում է `status` և `order_number` (guid). Մենք հաջող ենք համարում `completed` (և համատեղելիության համար success/paid/SUCCESS/COMPLETED/PAID). Այլ արժեք → failed.

- **GET (user redirect).** Query params. Handler թարմացնում է order → success → redirect `/checkout/success?order={order_number}`; fail → redirect `/checkout?order={order_number}`.
- **POST (webhook).** JSON or application/x-www-form-urlencoded. Պատասխան 200.

---

## 7. Init API (ձեր նախագիծ)

POST `/api/v1/payments/fastshift/init` body `{ orderNumber }` → response `{ redirectUrl }`. Frontend `window.location.href = redirectUrl`.

---

## 8. Checklist

- [x] Env: FASTSHIFT_TEST_MODE, FASTSHIFT_TOKEN (test), FASTSHIFT_LIVE_TOKEN (live).
- [x] Register request: order_number = **GUID (UUID)**; callback_url = `{APP_URL}/api/v1/payments/fastshift/callback?order={order.number}`.
- [x] Callback: order by `order` (URL) or `order_number` (GUID); status verified via **GET /vpos/order/status** (source of truth); idempotent if already paid.
- [x] GET callback → redirect user to success or checkout; POST webhook → 200; errors → 400/redirect without leaking internals.
- [x] Checkout-ում FastShift ընտրելիս redirect to FastShift (ոչ card modal).

---

## 9. Փուլ 4 ավարտված

Իրականացումը աշխատում է. Register (GUID, callback_url + order), callback/webhook with Status API verification, idempotency, GUID validation, safe responses. Մանրամասն՝ վերևի բաժիններում։

**Փաստաթղթի տարբերակ.** 1.1  
**Ամսաթիվ.** 2026-02-18  
**Ստատուս.** Փուլ 4 (FastShift) — ավարտված
