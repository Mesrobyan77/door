# Telcell Money — ինտեգրացիայի ձեռնարկ

> Այս փաստաթուղթը նախատեսված է **Telcell Money** (Telcell Wallet) միացման համար։ Բոլոր նյուանսները (URL test/live, PostInvoice, RESULT checksum, issuer_id, order lookup) ներառված են։
>
> **Աղբյուր.** WEB Магазинный шлюз v1.2 (PostInvoice redirect + callback). `payment integration/| Official doc for the API integrationm/TelCell/WEB Магазинный шлюз v1.2.md`

---

## 1. Ընդհանուր

- **Պրոտոկոլ.** Վճարումը սկսվում է **GET redirect** Telcell invoices URL (PostInvoice params + security_code). Callback — RESULT_URL (GET/POST), REDIRECT_URL (GET).
- **Կապ.** Telcell-ից ստանում եք shop_id (issuer), shop_key; test և live արժեքներ:
- **Արտարժույթ.** Միայն **AMD**.

### 1.1 API URL (test և live — նույնը)

**Telcell support-ի հաստատում.** Test և live ռեժիմներն երկուսն էլ ուղարկում են request **նույն** endpoint-ին.

| URL | Նշում |
|-----|--------|
| `https://telcellmoney.am/invoices` | ✅ Ճիշտ — օգտագործել **միշտ** (test և live) |
| ~~`https://telcellmoney.am/proto_test2/invoices`~~ | ❌ Ոչ — `proto_test2` path-ը չօգտագործել |

Կոդում: `TELCELL_API_BASE_URL` — test/live credentials-ը env-ից (տարբեր), URL-ը միշտ `https://telcellmoney.am/invoices`.

---

## 2. Environment variables

```env
# --- Telcell ---
TELCELL_TEST_MODE=true
# Test
TELCELL_SHOP_ID=
TELCELL_SHOP_KEY=
# Live
TELCELL_LIVE_SHOP_ID=
TELCELL_LIVE_SHOP_KEY=
APP_URL=https://yoursite.com
```

- **Test.** `TELCELL_TEST_MODE=true` → TELCELL_SHOP_ID, TELCELL_SHOP_KEY (URL-ը նույնն է).
- **Live.** TELCELL_LIVE_* — live credentials.

---

## 3. Callback URL-ներ

Telcell-ում գրանցել.

| Պարամետր | URL |
|----------|-----|
| **RESULT_URL** | `https://yoursite.com/api/v1/payments/telcell/callback` |
| **REDIRECT_URL** | `https://yoursite.com/api/v1/payments/telcell/redirect` |

---

## 4. Ինտեգրացիայի հոսք

1. Order + Payment (provider: `telcell`, status: `pending`), currency = AMD.
2. **PostInvoice redirect** — build URL: `{apiUrl}?action=PostInvoice&issuer=...&currency=֏&price=...&product=...&issuer_id=...&valid_days=1&lang=am|en|ru&security_code=...`.
3. Օգտատերը redirect → Telcell, վճարում է:
4. **RESULT_URL** — Telcell-ը ուղարկում է վճարման արդյունքը (GET կամ POST): issuer_id, status, invoice, payment_id, currency, sum, time, checksum. Ստուգել checksum → order lookup → status === "PAID" → order paid, payment completed, cart clear.
5. **REDIRECT_URL** — օգտատիրոջ redirect (query-ում order կամ issuer_id) → `/checkout/success?order=...`.

---

## 5. PostInvoice — redirect URL

**Method:** GET (բոլոր պարամետրերը query string-ում).

| Պարամետր | Նկարագրություն |
|----------|-----------------|
| action | `PostInvoice` |
| issuer | shop_id |
| currency | `֏` (AMD) |
| price | Գումար (ամբողջ թիվ, Math.round(order.total)) |
| product | base64(նկարագրություն), օր. base64("Order P123") |
| issuer_id | **base64(order.id)** — callback-ում order-ը նույնացնելու համար |
| valid_days | 1 (կամ ավելի) |
| lang | am / ru / en |
| security_code | MD5(shop_key + issuer + currency + price + product + issuer_id + valid_days) — string concatenation, արժեքները այն ձևով, ինչ ուղարկվում է (product/issuer_id base64) |

**Աղբյուր.** WEB v1.2 PHP example. Աղյուսակում valid_days բացակայում է, բայց PHP օրինակում կա — կոդում օգտագործում ենք valid_days-ով։

---

## 6. RESULT_URL callback

**Method:** GET կամ POST (params query-ում կամ body application/x-www-form-urlencoded / JSON).

**Պարամետրներ.** issuer_id, status, invoice, payment_id, currency, sum, time, checksum. (WEB v1.2-ում buyer չկա; v2 API-ում կա — մենք support ենք տալիս երկու checksum բանաձևի.)

**Checksum (WEB v1.2):**  
`MD5(shop_key + invoice + issuer_id + payment_id + currency + sum + time + status)` — concatenation, MD5 hex. Case-insensitive համեմատություն.

**Order lookup.** Callback-ում **issuer_id**-ն Telcell-ը կարող է վերադարձնել **plain** (decoded) order id, կամ base64:
- Փնտրում. id(raw) → id(decoded) → number(decoded) → number(raw) → fallback: միակ pending Telcell order նույն sum+currency-ով.
- **currency** callback-ում `51` (Telcell AMD կոդ) — fallback-ում քարտեզում 51 → AMD.

**status.** `PAID` = հաջող; այլ (REJECTED և այլն) = ձախողում. Ստուգել checksum → թարմացնել order/payment → պատասխան 200.

---

## 7. REDIRECT_URL

GET. Query-ում `order` կամ `issuer_id`. issuer_id decode (base64) կամ raw → order id/number → redirect `/checkout/success?order={number}`.

---

## 8. Init API (նախագիծ)

POST `/api/v1/payments/telcell/init` body `{ orderNumber, lang? }` → `{ redirectUrl }`. Frontend `window.location.href = redirectUrl`.

---

## 9. Checklist

- [ ] Env: TELCELL_TEST_MODE, TELCELL_SHOP_ID, TELCELL_SHOP_KEY (test) / TELCELL_LIVE_* (live).
- [ ] RESULT_URL, REDIRECT_URL գրանցել Telcell-ում.
- [ ] PostInvoice: URL միշտ `https://telcellmoney.am/invoices`; issuer_id = base64(order.id); security_code = MD5(shop_key+issuer+currency+price+product+issuer_id+valid_days).
- [ ] RESULT: checksum = MD5(shop_key+invoice+issuer_id+payment_id+currency+sum+time+status); order lookup by issuer_id (raw + decoded), fallback sum+currency (51→AMD).
- [ ] status === "PAID" → paid/completed; cart clear success-ից հետո։
- [ ] Միայն AMD orders.
- [ ] Checkout-ում Telcell ընտրելիս redirect to Telcell (ոչ card modal).

---

## 10. Troubleshooting

Եթե **redirect/PostInvoice-ը** աշխատում է, բայց order-ը paid չի դառնում կամ օգտատերը wrong page է տեսնում:

| Խնդիր | Ուր նայել |
|--------|------------|
| Request-ը ճիշտ է (support ասաց) | URL/params — OK |
| Order-ը չի դառնում paid | RESULT_URL (գրանցված է՞, հասնում է՞), checksum formula, test vs live; localhost — Telcell RESULT_URL չի հասնում |
| Օգտատերը չի վերադառնում / wrong page | REDIRECT_URL, APP_URL |
| Սխալ Telcell-ի էջում | Support + նրանց logs |

**RESULT_URL.** Endpoint `https://<դոմեն>/api/v1/payments/telcell/callback`. Telcell-ից հաստատել, որ test/live-ում RESULT_URL-ը ձեր դոմենի վրա է; localhost-ում callback-ը չի աշխատի.

**REDIRECT_URL.** Մենք ակնկալում ենք redirect `.../api/v1/payments/telcell/redirect?issuer_id=...` (կամ `order=...`). Support-ից հաստատել գրանցված URL-ը.

**PostInvoice URL.** Միշտ `https://telcellmoney.am/invoices` (ոչ proto_test2). Test/live — նույն URL, տարբեր credentials.

---

**Փաստաթղթի տարբերակ.** 2.0 (միացված TELCELL-URL-DIFF, TELCELL-TROUBLESHOOTING)  
**Ամսաթիվ.** 2026-02-25
