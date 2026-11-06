# Idram — ինտեգրացիայի ձեռնարկ

> Այս փաստաթուղթը նախատեսված է **Idram**-ի միացման համար։ Բոլոր նյուանսները (form, RESULT_URL երկու POST, checksum կարգ, precheck «OK») ներառված են, որպեսզի նոր նախագծում ինտեգրացիան աշխատի առաջին փորձից։
>
> **Պաշտոնական API նկարագրություն:**  
> `payment integration/| Official doc for the API integrationm/IDram/Idram Merchant API New.md`

---

## 1. Ընդհանուր

- **Պրոտոկոլ:** HTML form POST (UTF-8), callback — `application/x-www-form-urlencoded`.
- **Կապ:** Idram-ից ստանում եք SUCCESS_URL, FAIL_URL, RESULT_URL, SECRET_KEY, EMAIL (կարգավորում agreement-ից հետո).
- **Արտարժույթ.** Միայն **AMD** (Idram wallet). Ոչ AMD պատվերների համար Idram-ը չցուցադրել / չթույլատրել.

### 1.1 Form action (մեկ URL test և production)

| Նշանակում | URL |
|-----------|-----|
| **GetPayment** | `https://banking.idram.am/Payment/GetPayment` |

Test/live տարբերակ չկա — միևնույն URL-ն է. Test/live ռեժիմը որոշվում է Idram-ում գրանցված REC_ACCOUNT / SECRET_KEY-ով:

---

## 2. Environment variables

Յուրաքանչյուր նախագծում ավելացրեք.

```env
# --- Idram ---
IDRAM_TEST_MODE=true
# Test
IDRAM_REC_ACCOUNT=
IDRAM_SECRET_KEY=
# Live (production)
IDRAM_LIVE_REC_ACCOUNT=
IDRAM_LIVE_SECRET_KEY=
# App URL for callbacks (no trailing slash)
APP_URL=https://yoursite.com
```

- **Test:** `IDRAM_TEST_MODE=true` → օգտագործվում են `IDRAM_REC_ACCOUNT`, `IDRAM_SECRET_KEY`.
- **Live:** `IDRAM_TEST_MODE` ≠ `true` → `IDRAM_LIVE_REC_ACCOUNT`, `IDRAM_LIVE_SECRET_KEY`.

---

## 3. Callback URL-ներ (production)

Idram merchant panel-ում գրանցել.

| Պարամետր | URL |
|----------|-----|
| **RESULT_URL** | `https://yoursite.com/api/v1/payments/idram/callback` |
| **SUCCESS_URL** | `https://yoursite.com/api/v1/payments/idram/success` |
| **FAIL_URL** | `https://yoursite.com/api/v1/payments/idram/fail` |

Callback path-երը (`/api/v1/payments/idram/...`) — ըստ նախագծի; Idram merchant panel-ում գրանցեք `APP_URL` + path համակցությունը։

---

## 4. Ինտեգրացիայի հոսք (workflow)

1. Հաճախորդը հաստատում է պատվերը → ստեղծվում է Order + Payment (provider: `idram`, status: `pending`), currency = AMD.
2. **Form build** — EDP_LANGUAGE, EDP_REC_ACCOUNT, EDP_DESCRIPTION, EDP_AMOUNT, EDP_BILL_NO (order.number); optional EDP_EMAIL.
3. Form **POST** → `https://banking.idram.am/Payment/GetPayment` (UTF-8). Օգտատերը попадает Idram-ի էջ։
4. Idram-ը **երկու POST** ուղարկում է RESULT_URL-ին (նախ precheck, ապա payment confirmation).
5. Precheck: պատվերը/գումարը ստուգել **ԲԴ-ից**, պատասխան **«OK»** (plain text). Ոչ OK → Idram-ը redirect FAIL_URL.
6. Payment confirmation: **EDP_CHECKSUM** ստուգել, գումարը ԲԴ-ից, order/payment թարմացնել, պատասխան **«OK»**. Cart clear (logged-in) միայն success-ից հետո։
7. SUCCESS_URL / FAIL_URL — GET redirect օգտատիրոջ (success / error էջ).

---

## 5. Վճարման սկիզբ — form (GetPayment)

**Action:** `POST https://banking.idram.am/Payment/GetPayment`  
**Encoding:** UTF-8 (EDP_DESCRIPTION և այլ տեքստեր UTF-8).

### 5.1 Form fields (hidden)

| Field | Տիպ | Պարտադիր | Նկարագրություն |
|-------|-----|----------|-----------------|
| EDP_LANGUAGE | string | Yes | **EN**, **AM** (հայերեն), **RU** |
| EDP_REC_ACCOUNT | string | Yes | Merchant IdramID (EDP_REC_ACCOUNT) |
| EDP_DESCRIPTION | string | Yes | Ապրանք/Պատվերի նկարագրություն (UTF-8) |
| EDP_AMOUNT | string | Yes | Գումար, **տասնորդական — dot (.)** (օր. 1900 կամ 19.50) |
| EDP_BILL_NO | string | Yes | Հաշվի/պատվերի ID (order.number — ձեր accounting system-ից) |
| EDP_EMAIL | string | No | Էլ. փոստ; եթե set — overload-ում է Idram-ի EMAIL այդ գործարքի համար |
| (custom, առանց EDP_) | string | No | Idram-ը «after payment completion» վերադարձնում է merchant-ին (օր. order_number success redirect-ում) |

**Կարևոր.**  
- EDP_BILL_NO — ձեր համակարգում պատվերի/հաշվի unique ID; callback-ում **order-ը գտնելու** համար օգտագործել այդ արժեքը (find by order.number).  
- Գումարը միշտ **ստուգել ԲԴ-ից** (order.total), ոչ request-ից։

### 5.2 Օրինակ (doc)

```html
<form action="https://banking.idram.am/Payment/GetPayment" method="POST">
  <input type="hidden" name="EDP_LANGUAGE" value="EN">
  <input type="hidden" name="EDP_REC_ACCOUNT" value="100000114">
  <input type="hidden" name="EDP_DESCRIPTION" value="Order description">
  <input type="hidden" name="EDP_AMOUNT" value="1900">
  <input type="hidden" name="EDP_BILL_NO" value="1806">
  <input type="submit" value="submit">
</form>
```

Իրականացումում form-ը սովորաբար build է լինում server-ում (orderNumber, amount, description), ապա frontend-ը submit է անում (կամ server-ը վերադարձնում է formAction + formData, frontend-ը POST է ուղարկում Idram-ին):

---

## 6. RESULT_URL — **կրիտիկական նյուանսներ**

Idram-ը ուղարկում է **երկու** POST (Content-Type: `application/x-www-form-urlencoded`) RESULT_URL-ին. Պատասխանը **plain text** (առանց HTML). Եթե «OK» չստացվի, Idram-ը precheck-ում չի թույլատրի վճարում, confirm-ում — կհամարի ձախողում:

### 6.1 (a) Precheck — order authenticity

**Պարամետրներ:** `EDP_PRECHECK=YES`, `EDP_BILL_NO`, `EDP_REC_ACCOUNT`, `EDP_AMOUNT`.

- Ստուգել `EDP_REC_ACCOUNT` = ձեր config REC_ACCOUNT.
- **EDP_BILL_NO**-ով DB-ից գտնել order; ստուգել, որ order գոյություն ունի և paymentStatus = pending.
- **Գումարը** ստուգել **միայն ԲԴ-ից** (order.total), request-ի EDP_AMOUNT-ը համեմատել order.total-ի հետ (լվացում 0.01 tolerance float-ի համար).
- Եթե ամեն ինչ ճիշտ է → պատասխան **ճիշտ «OK»** (without any html formatting).  
- Հակառակ դեպքում → ցանկացած այլ տեքստ (օր. "EDP_BILL_NO not found", "EDP_AMOUNT mismatch") → Idram-ը գումարը չի փոխանցի և օգտատիրոջ կուղարկի **FAIL_URL**:

### 6.2 (b) Payment confirmation

**Պարամետրներ:** `EDP_BILL_NO`, `EDP_REC_ACCOUNT`, `EDP_PAYER_ACCOUNT`, `EDP_AMOUNT`, `EDP_TRANS_ID`, `EDP_TRANS_DATE`, `EDP_CHECKSUM`.

- **Checksum.** Doc-ի կարգը (concatenate colon-ով):  
  **EDP_REC_ACCOUNT : EDP_AMOUNT : SECRET_KEY : EDP_BILL_NO : EDP_PAYER_ACCOUNT : EDP_TRANS_ID : EDP_TRANS_DATE**  
  → MD5 hash → hex. Համեմատել **case-insensitive** (Idram-ը կարող է upper/lowercase ուղարկել).
- Եթե checksum-ը չի համապատասխանում → պատասխան `EDP_CHECKSUM not correct` (ոչ «OK»).
- Գումարը **կրկին** ԲԴ-ից (order.total); EDP_AMOUNT-ը չպետք է գերազանցի/տարբերվի order.total-ից (tolerance 0.01).
- Թարմացնել order (paymentStatus = paid, status = confirmed, paidAt), payment (status = completed, providerTransactionId = EDP_TRANS_ID), order event; **cart clear** (եթե order.userId).
- Պատասխան **«OK»**.

Idempotency: եթե order արդեն paid է, կարող եք նույնիսկ «OK» վերադարձնել (ոչ duplicate update), որպեսզի Idram-ը չկրկնի request:

---

## 7. Checksum — բանաձև

```
str = EDP_REC_ACCOUNT + ":" + EDP_AMOUNT + ":" + SECRET_KEY + ":" + EDP_BILL_NO + ":" + EDP_PAYER_ACCOUNT + ":" + EDP_TRANS_ID + ":" + EDP_TRANS_DATE
EDP_CHECKSUM = MD5(str), hex, optionally toUpperCase for comparison
```

Ստուգում: `(receivedChecksum || "").toUpperCase() === computedChecksum.toUpperCase()`.

---

## 8. SUCCESS_URL / FAIL_URL

GET redirect — օգտատերը Idram-ից վերադառնում է այդ URL-ներով: Idram-ը կարող է ավելացնել query params (օր. custom դաշտեր form-ից): Օգտագործել `order_number` / `order` redirect-ը `/checkout/success?order=...` կամ `/checkout/error?order=...` կատարելու համար:

---

## 9. Init API (ձեր նախագիծ)

Օրինակ flow: checkout-ում Idram ընտրելիս → order creation → **POST /api/v1/payments/idram/init** body `{ orderNumber, lang? }` → response `{ formAction, formData }` → frontend-ը build form և submit → Idram GetPayment:  

- Init-ում ստուգել order, currency === AMD, paymentStatus pending, idram payment pending; build form (EDP_BILL_NO = order.number, EDP_AMOUNT = order.total, EDP_DESCRIPTION, EDP_REC_ACCOUNT from config, EDP_LANGUAGE from lang map EN/AM/RU).

---

## 10. Checkout UI — Idram vs քարտի մոդալ

Idram-ի դեպքում **քարտի տվյալների մոդալ** (card number, expiry, CVV) **չի** պետք: Վճարումը Idram-ի էջում է: Ձևը submit → Idram → RESULT_URL callbacks → SUCCESS/FAIL redirect:  
Այսինքն checkout-ում Idram ընտրելիս «Place order» → միայն order create + form submit to Idram, **ոչ** card modal:

---

## 11. Թեստ (Cloudflare Tunnel) և production URL

- **Թեստ.** Cloudflare Tunnel (`dev.neetrino.com`) — մշտական domain, URL-ները չեն փոխվում վերագործարկման ժամանակ. RESULT_URL = `https://dev.neetrino.com/api/v1/payments/idram/callback`, SUCCESS_URL = `https://dev.neetrino.com/api/v1/payments/idram/success`, FAIL_URL = `https://dev.neetrino.com/api/v1/payments/idram/fail`. Մանրամասները՝ `03-TESTING-GUIDE.md`:
- **Production.** Միայն `/api/v1/payments/idram/...` path-եր; Idram panel-ում URL-ները պետք է համապատասխանեն app-ի route-երին:

---

## 12. Checklist — նոր նախագծում Idram միացնելիս

- [ ] Env: `IDRAM_TEST_MODE`, `IDRAM_REC_ACCOUNT`, `IDRAM_SECRET_KEY` (test/live), `APP_URL`.
- [ ] Idram panel: SUCCESS_URL, FAIL_URL, RESULT_URL — ձեր domain + path (օր. `/api/v1/payments/idram/callback`, success, fail).
- [ ] Form POST to `https://banking.idram.am/Payment/GetPayment`, UTF-8; EDP_BILL_NO = order.number.
- [ ] RESULT_URL handler: (a) precheck — validate order/amount from **DB**, respond exactly **«OK»**; (b) confirm — verify **checksum** (doc order), amount from DB, then «OK».
- [ ] Response **plain text**, no HTML.
- [ ] Միայն AMD orders (init-ում reject non-AMD).
- [ ] Cart clear միայն payment confirmation success-ից հետո (logged-in user).
- [ ] Checkout: Idram-ի դեպքում **ոչ** card modal — direct form submit to Idram.

---

**Փաստաթղթի տարբերակ.** 1.1  
**Ամսաթիվ.** 2026-02-18  
**Ծանոթություն.** Telcell, FastShift — առանձին ձեռնարկներ (հետագա փաստաթղթեր).
