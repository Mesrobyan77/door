# EHDM (Էլեկտրոնային ՀԴՄ) — ինտեգրացիայի ձեռնարկ

> Էլեկտրոնային ՀԴՄ = ԷՀԴՄ = E-HDM = electronic fiscal receipt. Ինտեգրացիա ՀՀ ՊԵԿ վեբ ծառայության հետ (ecrm.taxservice.am)՝ կտրոնների գրանցում/վերադարձ/պատճեն։

**Աղբյուրներ.**
- **Պաշտոնական.** `payment integration/| Official doc for the API integrationm/EHDM/uc_hhpek_electronic_HDM_integration_manual_11_2024_6734a3be6964d.html`

---

## 1. Ընդհանուր

- **API.** HTTPS POST, JSON body, **client certificate** (`.crt` + `.key`) + passphrase. Base URL: `https://ecrm.taxservice.am/taxsystem-rs-vcr/api/v1.0`.
- **Հիմնական մեթոդներ.** `/print` (կտրոն), `/printReturnReceipt` (վերադարձ), `/printCopy` (պատճեն), `/checkConnection`, `/activate`, `/configureDepartments`.
- **seq.** Յուրաքանչյուր հաջող հարցումից հետո ՊԵԿ-ը պահպանում է seq; հաջորդ հարցումում seq պետք է լինի **նախորդ + 1**. Առաջին արժեքը (օր. 65) — ըստ ՊԵԿ-ի/փաստաթղթի; հետագայում seq պահել **ԲԴ-ում** և ավելացնել 1 յուրաքանչյուր հաջող print/return/copy-ից հետո։

---

## 2. Գաղտնիքներ և ֆայլեր (.crt / .key)

### Ինչը **գաղտնի** է (միայն ENV, ոչ git)

| Փոփոխական | Նկարագրություն | Պահել |
|------------|-----------------|-------|
| `EHDM_KEY_PASSPHRASE` | Պարոլ `.key` ֆայլի համար | **Միայն .env** — երբեք կոդ/repo |
| `.key` ֆայլի **բովանդակությունը** | Private key | Ֆայլը պահել **repo-ից դուրս** (տես ստորև) |
| `.crt` ֆայլ | Client certificate | Կրիպտոգրաֆիական հավաստագիր — նույնպես **ոչ repo** (լավ պրակտիկա) |

### Որտեղ պահել .crt և .key

- **Երբեք** չcommit անել `.crt`/`.key` repo-ում։
- **Լոկալ.** Խորհուրդ — `Private/` թղթապանակ (արդեն **.gitignore**-ում է). ENV-ում `EHDM_CERT_PATH`, `EHDM_KEY_PATH`. **Կարևոր.** Next.js-ը աշխատում է `apps/web`-ից, այդ պատճառով `./Private/...` = `apps/web/Private/...`. Եթե `Private/`-ը **նախագծի արմատում** է — .env-ում օգտագործել **բացարձակ** ճանապարհ, օր. `/path/to/borboraqua.am/Private/00505298.crt`.
- **Production (Vercel/Render/վերբ).** Սերվերում կամ secrets manager-ում պահել ֆայլերի **բովանդակությունը** (base64 կամ raw) և deploy ժամանակ գրել ֆայլ (tmp/secure dir), ապա `EHDM_CERT_PATH`/`EHDM_KEY_PATH` ցույց տալ այդ path-ին. Կամ օգտագործել platform-ի «secret file»/volume, եթե կա.
- **Ամփոփում.**  
  - **Սեկրետ.** passphrase → միայն ENV.  
  - **.key / .crt.** ֆայլերը → repo-ից դուրս; path → ENV.  
  - **Private/** — հարմար է **լոկալ** զարգացման համար (gitignore); production-ում path-ը կլինի սերվերի path.

---

## 3. Environment variables

Փոխանցել **Private/** և **ehdm-config.txt**-ից; **գաղտնի** արժեքները միայն `.env`-ում (ոչ git).

| Փոփոխական | Նկարագրություն | Գաղտնի | Աղբյուր (Private) |
|------------|-----------------|--------|-------------------|
| `EHDM_API_URL` | API base URL | Ոչ | `https://ecrm.taxservice.am/taxsystem-rs-vcr/api/v1.0` |
| `EHDM_CRN` | Գրանցման համար (CRN) | Ոչ* | CRN=52031720 |
| `EHDM_TIN` | ՀՎՀՀ | Ոչ* | TIN=00505298 |
| `EHDM_CERT_PATH` | Ճանապարհ դեպի `.crt` ֆայլ | — | path, օր. `./Private/00505298.crt` |
| `EHDM_KEY_PATH` | Ճանապարհ դեպի `.key` ֆայլ | — | path, օր. `./Private/00505298.key` |
| `EHDM_KEY_PASSPHRASE` | Պարոլ `.key`-ի համար | **Այո** | միայն .env |
| `EHDM_INITIAL_SEQ` | Առաջին seq. **200** խորհուրդ՝ հին site-ից անցնելիս (որ չհամընկնի) | Ոչ | 200 |
| `EHDM_DEFAULT_ADG_CODE` | ԱՏԳ կոդ (դեֆոլտ) | Ոչ | 2201 |
| `EHDM_DEP` | **Հարկման տեսակ**. 1=ԱԱՀ-ով, 2=առանց ԱԱՀ, 3=շրջանառու, 7=միկրո | Ոչ | 1 |
| `EHDM_VAT_PERCENT` | ԱԱՀ (%) — (օր. 16,67). Օպցիոնալ, ցուցադրության համար | Ոչ | 16.67 |
| `EHDM_DEFAULT_UNIT` | Չափման միավոր (օր. Հատ) | Ոչ | Հատ |
| `EHDM_CASHIER_ID` | Գանձապահի ID | Ոչ | 1 |
| `EHDM_SHIPPING_ENABLED` | Առաքում առանձին տող (1/0) | Ոչ | 1 |
| `EHDM_SHIPPING_ADG_CODE` | ԱՏԳ առաքման համար | Ոչ | 49.42 |
| `EHDM_SHIPPING_GOOD_CODE` | Ապրանքի կոդ առաքման | Ոչ | 007 |
| `EHDM_SHIPPING_DESCRIPTION` | Նկարագրություն առաքման | Ոչ | Առաքում |
| `EHDM_SHIPPING_UNIT` | Միավոր առաքման | Ոչ | Հատ |

\* CRN/TIN բիզնես-տվյալներ են; production-ում env-ում պահելը ընդունելի է (ոչ «խիստ» գաղտնիք, բայց չcommit անել արժեքները .env.example-ում)։

---

## 4. Seq 200 — հին site-ից անցնելիս

Որպեսզի նոր նախագծի seq-ը **չհամընկնի** հին կայքի հետ (որտեղ seq-ը կարող էր 65–100+ լինել), խորհուրդ է տրվում.

- **.env**-ում դնել `EHDM_INITIAL_SEQ=200` (կամ ավելի մեծ, եթե հին կայքում seq-ը արդեն 100+ էր):
- Եթե ԲԴ-ում արդեն կա `ehdm_state` տող (միգրացիայից) `nextSeq=65`-ով, **մեկ անգամ** թարմացնել.  
  `UPDATE ehdm_state SET "nextSeq" = 200 WHERE id = 'default';`

---

## 5. API — հարցումներ

- **Auth.** HTTPS client certificate: CURLOPT_SSLCERT = `.crt` path, CURLOPT_SSLKEY = `.key` path, CURLOPT_SSLKEYPASSWD = passphrase.
- **Content-Type.** `application/json`.
- **Base.** `EHDM_API_URL` = `https://ecrm.taxservice.am/taxsystem-rs-vcr/api/v1.0`.

### 5.1 POST /print (կտրոն)

- **Body.** `mode`, `crn`, `seq`, `cashierId`, `items[]`, `cashAmount` կամ `cardAmount`.
- **items[].** `dep`, `adgCode`, `goodCode`, `goodName`, `quantity`, `unit`, `price`; optional `discount`, `discountType`.
- **mode.** 2 = ապրանքներով կտրոն (սովորական վաճառք).
- **seq.** Միացնել ԲԴ-ի seq (սկզբում `EHDM_INITIAL_SEQ`, ապա +1 յուրաքանչյուր հաջող print-ից հետո).

### 5.2 POST /printReturnReceipt (վերադարձ)

- **Body.** `crn`, `seq`, `receiptId` (նախկին կտրոնից), `returnItemList[]` (`receiptProductId`, `quantity`), `cashAmountForReturn` կամ `cardAmountForReturn`.

### 5.3 POST /printCopy (պատճեն)

- **Body.** `crn`, `seq`, `receiptId`.

### 5.4 Seq-ի կառավարում

- Առաջին անգամ օգտագործել `EHDM_INITIAL_SEQ` (օր. 65).
- Յուրաքանչյուր հաջող `/print`, `/printReturnReceipt`, `/printCopy`-ից հետո **պահել** seq ԲԴ-ում (օր. `ehdm_seq` աղյուսակ կամ key-value) և հաջորդ հարցումում օգտագործել **նախորդ seq + 1**.

---

## 6. Ինտեգրացիայի հոսք (նախագիծ)

1. Պատվեր հաստատվելուց (status → paid/confirmed) → կանչել EHDM `/print` (order items + shipping եթե `EHDM_SHIPPING_ENABLED`).
2. Պատասխանում պահել `receiptId`, `qr`, `fiscal`, `crn`, `sn`, `tin`, `time`, `total` — order-ի meta կամ `ehdm_receipts` աղյուսակ.
3. Վերադարձի դեպքում — `/printReturnReceipt` `receiptId`-ով և `returnItemList`.
4. Պատճեն — `/printCopy` `receiptId`-ով.

---

## 7. Իրականացում (նախագիծ)

- **Config / client.** `lib/payments/ehdm/` — config, client (HTTPS + client cert), seq (БД `ehdm_state`), buildPrintBody, callPrint.
- **Print on paid.** `printReceiptForOrder(orderId)` կանչվում է ավտոմատ՝ Ameriabank, Telcell, Idram, FastShift callback-ներից և ադմինում `paymentStatus` → paid դնելիս (fire-and-forget).
- **БД.** `ehdm_state` (մեկ տող, nextSeq), `ehdm_receipts` (orderId, receiptId, seq, fiscal, qr, response).
- **Ճանապարհ сертификата.** ENV-ի path-ը resolve է լինում `process.cwd()`-ի նկատմամբ. Եթե dev server-ը գործարկում եք **repo root**-ից — `./Private/00505298.crt` ճիշտ է; եթե `apps/web`-ից — օգտագործել `../../Private/00505298.crt` կամ absolute path.

---

## 8. Checklist

- [ ] ENV: `EHDM_API_URL`, `EHDM_CRN`, `EHDM_TIN`, `EHDM_CERT_PATH`, `EHDM_KEY_PATH`, `EHDM_KEY_PASSPHRASE`, `EHDM_INITIAL_SEQ`, dep/unit/cashier/shipping.
- [ ] `.crt`/`.key` — **repo-ից դուրս**; լոկալում `Private/` (gitignore), path-ը ENV-ում.
- [ ] Seq — ԲԴ-ում պահել և +1 յուրաքանչյուր հաջող print/return/copy-ից հետո.
- [ ] Client certificate HTTPS (Node: `https.Agent` with cert/key/passphrase) կամ fetch with cert options.
- [x] Միայն AMD պատվերների համար EHDM (եթե կան այլ արժույթներ).
- [x] Print ավտոմատ — payment callback-ներ + ադմին paid.

---

## 9. Ստուգում թեստից առաջ (по документации)

| Էլեմենտ | Փաստաթուղթ | Մեր կոդ | Статус |
|---------|----------------|----------|--------|
| **URL** | `https://ecrm.taxservice.am/taxsystem-rs-vcr/api/v1.0` + `/print` | `config.apiUrl` + `/print` | ✓ |
| **Auth** | Client cert (.crt) + key (.key) + passphrase | `https.Agent` cert/key/passphrase | ✓ |
| **Content-Type** | application/json | application/json | ✓ |
| **Body: mode** | 2 (ապրանքներով կտրոն) | MODE_SALE_WITH_ITEMS = 2 | ✓ |
| **Body: crn, seq, cashierId** | string, int, int | config.crn, seq, config.cashierId | ✓ |
| **Body: cardAmount / cashAmount** | Один заполнен, второй 0 в образце | Оба передаём (total и 0) | ✓ |
| **Body: partialAmount, prePaymentAmount, partnerTin** | 0, 0, null в образце | 0, 0, null добавлены | ✓ |
| **Body: items[]. dep, adgCode, goodCode, goodName, quantity, unit, price** | Ըստ փաստաթղթի | buildPrintBody — те же поля, goodCode=sku, goodName до 30 символов | ✓ |
| **Seq** | Уникальный, +1 после каждого запроса | getNextSeqAndIncrement() в транзакции, откат при ошибке | ✓ |
| **Response** | code === 0, result.receiptId, fiscal, qr | Проверяем code !== 0, сохраняем в ehdm_receipts | ✓ |
| **Только AMD** | — | printReceiptForOrder проверяет order.currency === "AMD" | ✓ |
| **Повтор** | Не печатать дважды на заказ | Проверка order.ehdmReceipt | ✓ |

Թեստից առաջ. ENV-ը լրացված, `Private/00505298.crt` և `.key` առկա (path-ը **բացարձակ**, եթե Private-ը repo արմատում է), ԲԴ-ում `ehdm_state` nextSeq ≥ 200 (կամ UPDATE).

---

## 10. Իրականացման կարգավիճակ (2026-02)

- **Backend.** `/print` — config, client (cert/key), seq (DB), buildPrintBody, printReceiptForOrder. Կանչվում է Ameriabank/Idram/Telcell/FastShift callback-ից և ադմինում paymentStatus → paid.
- **Ցուցադրում.** Ֆիսկալ կտրոն ցույց է տրվում ադմինի պատվերի դետալներում և կլիենտի պատվերի էջում (EhdmReceiptBlock, HTML; PDF — հաջորդ փուլ).
- **Ցանկ.** Ադմինի պատվերների աղյուսակում «Invoice» սյունակ — իկոն (ստեղծված / չկա).

---

**Փաստաթղթի տարբերակ.** 1.1  
**Ամսաթիվ.** 2026-02-19
