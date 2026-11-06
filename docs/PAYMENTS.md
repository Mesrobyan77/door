# Վճարումների միացում

## Scope և readiness

Աշխատող application scope-ը `cash_on_delivery`, `idram`, `arca` է։ Ameriabank, Telcell և FastShift-ի adapter, ընտրություն կամ configuration այս release-ում չկա։ COD-ը պատվերը ստեղծելիս պահպանում է նախորդ ընթացքը։ Online method-ները checkout-ում երևում են միայն երբ իրենց ամբողջ server-side configuration-ը լրացված է։

Կոդն իրականացված է, սակայն merchant credentials-ով sandbox verification դեռ չի արվել։ Live activation կամ deploy չի արվել։

## Կյանքի ցիկլ

Online checkout-ը transaction-ով ստեղծում է պատվերը և payment attempt-ը `PENDING`, ինչպես նաև մեկ անգամ նվազեցնում է պատվերի variant stock-ը։ Այս պահին cart-ը մնում է ակտիվ։ Միայն provider-ի authoritative հաստատումից հետո payment-ը դառնում է `CAPTURED`, order-ը `CONFIRMED`, և checkout snapshot-ի քանակն է հանվում cart-ից (ավելի ուշ ավելացված քանակը պահպանվում է)։

Browser redirect-ը վճարման ապացույց չէ. ArCa callback-ը `getOrderStatusExtended.do`-ով հարցնում է gateway-ին, Idram RESULT_URL-ը ստուգում է merchant account-ը, DB amount-ը և MD5 checksum-ը։ Կրկնվող Idram callback-ները idempotent են։ Gateway network timeout-ը մնում է unknown/pending, stock-ը չի վերականգնվում ավտոմատ. սա DEC-023/024-ի պահանջն է և պահանջում է admin reconciliation նախքան release-ը։

## Idram

Պետք է մատակարարից ստանաք test և live `REC_ACCOUNT`/`SECRET_KEY`, merchant panel-ում ակտիվացնեք ինտեգրումը և գրանցեք public HTTPS URL-ները.

```text
POST {PAYMENT_APP_URL}/api/payments/idram/callback   (RESULT_URL)
GET  {PAYMENT_APP_URL}/api/payments/idram/success    (SUCCESS_URL)
GET  {PAYMENT_APP_URL}/api/payments/idram/fail       (FAIL_URL)
```

`.env`-ում լրացրեք `IDRAM_TEST_MODE=true`, `IDRAM_REC_ACCOUNT`, `IDRAM_SECRET_KEY`, `PAYMENT_APP_URL`։ Live-ի համար `IDRAM_TEST_MODE=false`, `IDRAM_LIVE_REC_ACCOUNT`, `IDRAM_LIVE_SECRET_KEY`։ Idram-ը AMD-only է և օգտագործում է hosted `https://banking.idram.am/Payment/GetPayment` form POST-ը։ Sandbox-ում մեկ հաջող և մեկ մերժված փորձից հետո ստուգեք callback response-ը ճշգրիտ `OK`, payment/provider reference-ը, cart snapshot clearing-ը և stock-ը։

## ArCa

ArCa-ն միացվում է ընտրած acquiring bank-ի միջոցով. ստացեք նրա gateway base URL, test/live `userName`/`password`, merchant cabinet access և test card/3DS հրահանգները։ Օգտագործված protocol-ը պաշտոնական ArCa IPay Merchant API-ի hosted-payment տարբերակն է՝ `POST register.do`, ապա user redirect դեպի gateway-ի `formUrl`, և authoritative `POST getOrderStatusExtended.do` verification. Մեր code-ը փոխանցում է AMD-ը `×100` minor units-ով, numeric currency `051` և `FORCE_3DS2` JSON parameter-ով։

Լրացրեք `ARCA_TEST_MODE=true`, `ARCA_BASE_URL`, `ARCA_USERNAME`, `ARCA_PASSWORD`, `PAYMENT_APP_URL`։ Live-ի համար `ARCA_TEST_MODE=false`, `ARCA_LIVE_BASE_URL`, `ARCA_LIVE_USERNAME`, `ARCA_LIVE_PASSWORD`։ Callback URL-ը gateway registration request-ում ինքնաշխատ փոխանցվում է՝ `{PAYMENT_APP_URL}/api/payments/arca/callback?order={orderNumber}`։ Merchant/bank-ից հաստատեք public HTTPS domain/allowlist պահանջները։

Sandbox-ում ստուգեք `register.do` registration-ը, 3DS hosted form-ը, `DEPOSITED` status-ի callback verification-ը, ինչպես նաև decline/pending/repeated return արդյունքները։ Միայն `DEPOSITED`/status `2` է համարվում վճարված։

## Մնացած արտաքին քայլերը

1. Ստանալ երկու provider-ի sandbox credentials և ArCa acquiring-bank gateway URL-ը։
2. Գրանցել Idram return/result URLs-ը և հաստատել ArCa public HTTPS/allowlist պահանջները։
3. Environment variables-ը տեղադրել միայն deployment secret store-ում, ոչ source control-ում։
4. Կատարել sandbox verification ըստ վերևի սցենարների, ապա առանձին հաստատել live activation-ը։
