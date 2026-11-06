# Ameriabank vPOS 3.1 — ինտեգրացիայի ձեռնարկ

> Այս փաստաթուղթը նախատեսված է **Ameriabank**-ի միացման համար։ Բոլոր նյուանսները (API տիպեր, օրենագրի սխալներ, success-ի ճանաչում) ներառված են, որպեսզի նոր նախագծում ինտեգրացիան աշխատի առաջին փորձից։
>
> **Պաշտոնական API նկարագրություն:**  
> `payment integration/| Official doc for the API integrationm/AmeriaBank/vPOS - Ameriabank.md`

---

## 1. Ընդհանուր

- **Պրոտոկոլ:** REST, JSON (Content-Type: `application/json; charset=utf-8`).
- **Կապ:** Միացումը ստանում եք Ameriabank-ից (ClientID, Username, Password).
- **Լեզու Pay ֆորմայի:** `lang`: `en`, `am` (հայերեն), `ru`.

### 1.1 Հիմնական URL-ներ (առանց trailing slash)

| Միջավայր | Base URL |
|----------|----------|
| **Test** | `https://servicestest.ameriabank.am/VPOS` |
| **Live** | `https://services.ameriabank.am/VPOS` |

Ընտրությունը՝ env-ով (տես բաժին 2).

---

## 2. Environment variables

Յուրաքանչյուր նախագծում ավելացրեք.

```env
# --- Ameriabank vPOS ---
AMERIA_TEST_MODE=true
# Test
AMERIA_CLIENT_ID=
AMERIA_USERNAME=
AMERIA_PASSWORD=
# Live (production)
AMERIA_LIVE_CLIENT_ID=
AMERIA_LIVE_USERNAME=
AMERIA_LIVE_PASSWORD=
# App URL for callbacks (no trailing slash)
APP_URL=https://yoursite.com
```

- **Test:** `AMERIA_TEST_MODE=true` → օգտագործվում են `AMERIA_CLIENT_ID`, `AMERIA_USERNAME`, `AMERIA_PASSWORD` և test base URL.
- **Live:** `AMERIA_TEST_MODE` ≠ `true` → `AMERIA_LIVE_*` և live base URL.

---

## 3. Դրամի կոդեր (Currency)

vPOS-ը աշխատում է **ISO 4217 numeric** արժեքներով.

| Կոդ | Արժեք | Առք/Վաճառք |
|-----|--------|------------|
| AMD | `051` | default |
| EUR | `978` | |
| USD | `840` | |
| RUB | `643` | |

Պարտադիր չէ Currency ուղարկել; default = AMD (051).

---

## 4. Ինտեգրացիայի հոսք (workflow)

1. Հաճախորդը հաստատում է պատվերը → ստեղծվում է Order + Payment (provider: `ameriabank`, status: `pending`).
2. **InitPayment** — պատվերը գրանցվում է vPOS-ում, ստանում եք `PaymentID`.
3. Redirect օգտատիրոջը bank Pay page:  
   `{baseUrl}/Payments/Pay?id={PaymentID}&lang={lang}`.
4. Օգտատերը վճարում է բանկի ֆորմայում; 3D Secure եթե պահանջվի.
5. Բանկը redirect է անում **BackURL**-ով (GET) + query params.
6. **Մի հավ trust միայն URL params.** Պարտադիր **GetPaymentDetails(PaymentID)** — ստատուսը որոշվում է միայն API պատասխանով.
7. GetPaymentDetails success → order `paymentStatus = paid`, payment `status = completed`, cart clear (եթե logged-in).  
   Fail → `paymentStatus = failed`, redirect error page.

---

## 5. InitPayment

**Endpoint:** `POST {baseUrl}/api/VPOS/InitPayment`

### 5.1 Request body (JSON)

| Параметр | Տիպ | Պարտադիր | Նկարագրություն |
|---------|-----|----------|-----------------|
| ClientID | string | Yes | Merchant ID |
| Username | string | Yes | Merchant user |
| Password | string | Yes | Merchant password |
| OrderID | **integer** | Yes | **Միայն ամբողջ թիվ.** Ներքին order id-ից hash/number փոխարկել (օր. 1–999999999) |
| Amount | number | Yes | Գումար |
| Currency | string | No | 051 / 978 / 840 / 643 |
| Description | string | Yes | Օր. "Order #12345" |
| BackURL | string | No, բայց **խորհուրդ** | URL վերադարձի հետ (success/fail — միևնույն URL-ը, արդյունքը GetPaymentDetails-ով) |
| Opaque | string | No | **Խորհուրդ:** Order ID (UUID/crypto id) — callback-ում order-ը գտնելու համար |
| lang | string | No | en / am / ru (Pay page) |
| Timeout | integer | No | Session վայրկյան (max 1200, default 1200) |

**Կարևոր.**  
- `OrderID` — API-ն սպասում է **integer**. Եթե ձեր order id-ը string/UUID է, փոխարկեք ամբողջ թվի (օր. stable hash `% 1000000000`), որպեսզի նույն order-ը միշտ նույն OrderID ունենա.  
- `Opaque` — չխառնել OrderID-ի հետ. Opaque = ձեր ներքին order id (string), callback-ում `opaque` param-ով կգա և կօգտագործեք DB-ում order գտնելու համար.

### 5.2 Response (JSON)

| Параметр | Տիպ | Նկարագրություն |
|---------|-----|-----------------|
| PaymentID | string | Օգտագործել Pay page redirect-ում և GetPaymentDetails-ում |
| ResponseCode | **integer** | **Success = 1** (ոչ "1", այլ number 1) |
| ResponseMessage | string | Սխալի դեպքում նկարագրություն |

Success: `ResponseCode === 1` և `PaymentID` present.

### 5.3 Pay page redirect

Օգտատիրոջը ուղարկել.

```
GET {baseUrl}/Payments/Pay?id={PaymentID}&lang={lang}
```

`lang`: `en` | `am` | `ru`.

---

## 6. BackURL callback — **կրիտիկական նյուանսներ**

Վճարումից հետո բանկը redirect է անում **BackURL**-ով (GET). Query parameters (պաշտոնական doc):

| Parameter | Նկարագրություն |
|-----------|-----------------|
| orderID | Transaction ID (string) |
| **resposneCode** | **Օրենագրի սխալ.** Գրված է **resposneCode** (ոչ responseCode). Success = `00` |
| paymentID | Unique payment ID |
| opaque | Նույնը, ինչ InitPayment-ում ուղարկել եք (order id) |

### 6.1 ⚠️ Ոչ միայն URL-ին չհավ trust

- URL-ի `resposneCode=00`-ը **չի բավարար** վճարումը հաստատելու համար (հնարավոր է կեղծ/replay).
- **Միշտ** callback-ում կանչել **GetPaymentDetails(paymentID)** և success/fail որոշել **միայն** GetPaymentDetails-ի պատասխանով.

### 6.2 Callback-ում անել

1. Վերցնել `paymentID`, `opaque` (եթե բացակայում են → error redirect).
2. `opaque`-ով DB-ից գտնել order (և payment).
3. `getPaymentDetails(paymentID)` — bank API.
4. Success-ը որոշել GetPaymentDetails-ի ResponseCode + PaymentState/OrderStatus-ով (տես բաժին 7).
5. Success → order paid, payment completed, cart clear; redirect success page.  
   Fail → order paymentStatus failed, redirect error page.

---

## 7. GetPaymentDetails — success-ի ճանաչում

**Endpoint:** `POST {baseUrl}/api/VPOS/GetPaymentDetails`

**Request:**  
`{ "PaymentID": "<paymentID>", "Username": "...", "Password": "..." }`

**Response** — շատ դաշտեր. Կարևորներ՝ success-ի համար.

### 7.1 ResponseCode

- Doc: success = **"00"** (string).
- **Փաստ.** API-ն կարող է վերադարձնել.
  - `"00"`
  - `"00 : Payment Successfully Completed"` (լրիվ տեքստ)
  - կամ number `0` / string `"0"`  
→ Success համարել, եթե `ResponseCode`-ը **"00"** է **կամ** **սկսվում է "00"**-ով (օր. `responseCode.startsWith("00")`).  
Եթե արժեքը `0` կամ `"0"` է, նախ նորմալացնել `"00"`.

### 7.2 PaymentState / OrderStatus

- Doc: PaymentState string, OrderStatus integer (Table 2).
- **Փաստ.** GetPaymentDetails-ում **PaymentState** կարող է գալ **թիվ** (օր. `2`, `4`), **OrderStatus** — string `"2"` կամ number.

**Table 2. Payment State Values (Order Status Code):**

| Payment State       | Order Status Code | Description                    |
|---------------------|-------------------|--------------------------------|
| payment_started     | 0                 | Registered, not paid           |
| payment_approved    | 1                 | Preauthorized                  |
| **payment_deposited** | **2**           | **Amount successfully authorized** |
| payment_void        | 3                 | Authorization cancelled        |
| payment_refunded    | 4                 | Refunded                       |
| payment_autoauthorized | 5              | Via ACS                        |
| payment_declined     | 6                 | Declined                       |

Success համարել, եթե **ResponseCode**-ը OK է (վերև) **և** որևէ մեկը.

- `PaymentState === "Successful"` | `"payment_deposited"` | `"Deposited"` | `2` | `4`  
  (կամ `String(paymentState).toLowerCase() === "successful"`)
- **կամ** `OrderStatus === 2` կամ `4` (number կամ string "2"/"4" — parseInt).

Պրակտիկայում SOAP/GetTransactionList նմուշում երբեմն `PaymentState` = 4 և `RespCode` = "00 : Payment Successfully Completed" — այդ պատճառով 4-ը success արժեքների ցանկում թույլատրելի է (Refund-ից հետո արդեն այլ ResponseCode կլինի).

### 7.3 Casing

API-ն կարող է վերադարձնել `responseCode` / `PaymentState` / `OrderStatus` այլ casing-ով. Կարդալ երկու տարբերակ (օր. `details.ResponseCode ?? details.responseCode`).

---

## 8. CancelPayment

**Պայման:** Միայն **72 ժամ** InitPayment-ից (payment initialization-ից).

**Endpoint:** `POST {baseUrl}/api/VPOS/CancelPayment`

**Request:**  
`{ "PaymentID": "<paymentID>", "Username": "...", "Password": "..." }`

**Response:**  
`ResponseCode` (string) = "00" → success.  
Հաջող cancel-ից հետո order/payment status-ը կարող եք դնել `cancelled` (admin-ում payment status ցանկում **cancelled** պետք է թույլատրելի լինի).

---

## 9. RefundPayment

**Endpoint:** `POST {baseUrl}/api/VPOS/RefundPayment`

**Request:**  
`{ "PaymentID": "...", "Username": "...", "Password": "...", "Amount": <number> }`  
- **Amount** — վերադարձվող գումար; **չի կարող գերազանցել** transaction amount.  
- Ամբողջ գումարի refund = transaction Amount.

**Response:**  
`ResponseCode` = "00" → success.  
Հաջող refund-ից հետո payment status → `refunded`.

---

## 10. Table 1 — հիմնական Response codes (համառոտ)

| Code | Նկարագրություն |
|------|-----------------|
| **00** | Approved. Payment successfully completed |
| 01 | Order already exists |
| 05 | Incorrect Parameters |
| 06 | Unregistered OrderId |
| 20 | Incorrect Username and Password |
| 30 | Incorrect Value of Opaque field |
| 500 | Unknown error |
| 510 | Incorrect parameters |
| 513 | Do not have Refund operation permission |
| 514 | Do not have Reverse operation permission |

Մնացած decline/error codes — doc Table 1.

---

## 11. Admin / Order statuses

- **Order paymentStatus** արժեքները պետք է ներառեն.  
  `pending`, `paid`, `failed`, `refunded`, **`cancelled`**.  
  Եթե validation-ում միայն `pending, paid, failed, refunded` է, **cancelled**-ը ավելացնել, որպեսզի admin-ից Cancel (payment cancel) աշխատի.
- Refund/Cancel UI — Refund = paymentStatus `refunded`, Cancel = paymentStatus `cancelled`.  
  (Բանկի CancelPayment/RefundPayment API-ն կանչել համապատասխան գործողությունների համար, ապա DB թարմացնել.)

---

## 12. Callback URL-ներ (օրինակ)

Հաճախ BackURL-ը կարգավորում են `/api/v1/payments/ameriabank/callback` path-ով.

- Success/fail միևնույն BackURL (օր. `https://yoursite.com/api/v1/payments/ameriabank/callback`) — արդյունքը միշտ GetPaymentDetails-ով.
- Fail redirect (եթե առանձին է) — օր. նույն `api/v1/payments/ameriabank/callback`; բանկը կարող է ուղարկել այդ URL, եթե կարգավորված է.

Մեր օրինակում BackURL = `{APP_URL}/api/v1/payments/ameriabank/callback`.  
Callback handler-ը GET-ով ստանում է query params, կանչում GetPaymentDetails, թարմացնում order/payment, redirect `/checkout/success` կամ `/checkout/error`.

---

## 13. Checklist — նոր նախագծում Ameriabank միացնելիս

- [ ] Env: `AMERIA_TEST_MODE`, test/live credentials, `APP_URL`.
- [ ] OrderID — integer; Opaque — ձեր order id (string) callback-ում order գտնելու համար.
- [ ] InitPayment success = `ResponseCode === 1` (number).
- [ ] Redirect Pay page: `{baseUrl}/Payments/Pay?id={PaymentID}&lang={lang}`.
- [ ] BackURL handler: **մի trust միայն URL.** Միշտ **GetPaymentDetails(paymentID)**.
- [ ] GetPaymentDetails success: ResponseCode "00" or startsWith("00"); PaymentState/OrderStatus — նորմալացնել string/number, 2/4, "Successful"/"payment_deposited"/"Deposited".
- [ ] Admin payment status: ներառել **cancelled** և **refunded**.
- [ ] CancelPayment — 72 ժամ; RefundPayment — Amount ≤ transaction amount.
- [ ] BackURL param name: **resposneCode** (typo in official doc).
- [ ] Currency: 051 (AMD), 978 (EUR), 840 (USD), 643 (RUB).

---

**Փաստաթղթի տարբերակ.** 1.0  
**Ամսաթիվ.** 2026-02-18  
**Ծանոթություն.** Idram, Telcell, FastShift — առանձին նման ձեռնարկներ կպահանջվեն (հետագա փաստաթղթեր).
