# Arca — руководство по интеграции

> Этот документ описывает интеграцию через систему **ArCa** — национальную платёжную систему Армении. Один и тот же API используют несколько банков (IDBank, Inecobank, ACBA и др.). Отличается только base URL и credentials.
>
> **Ameriabank** использует собственный API (vPOS) и **не относится** к этому документу — см. `AMERIABANK-INTEGRATION.md`.
>
> **Официальная документация:** `payment integration/| Official doc for the API integrationm/Arca/Merchant Manual_1.55.1.0.md`

---

## 1. Общие сведения

- **Протокол:** HTTPS POST, `application/x-www-form-urlencoded`
- **Аутентификация:** userName + password (от банка-эквайера)
- **Callback:** 1 URL (returnUrl) — redirect пользователя через браузер (не server-to-server)
- **3DS2:** `jsonParams: {"FORCE_3DS2":"true"}`
- **Валюты:** AMD (051), USD (840), EUR (978), RUB (643)

### Банки на Arca

| Банк | Base URL (test) | Base URL (live) |
|------|----------------|-----------------|
| **IDBank** | `https://ipaytest.arca.am:8445/payment/rest` | `https://ipay.arca.am/payment/rest` |
| **Inecobank** | `https://pg.inecoecom.am/payment/rest` (test credentials) | `https://pg.inecoecom.am/payment/rest` |
| **ACBA, Converse, Evoca, AMIO…** | Уточнить у банка | Уточнить у банка |

Inecobank использует свой gateway (`pg.inecoecom.am`), но API идентичный Arca — те же endpoint-ы, параметры и статусы.

---

## 2. Environment variables

```env
# --- Arca ---
ARCA_TEST_MODE=true
ARCA_BANK=idbank
# Test
ARCA_USERNAME=
ARCA_PASSWORD=
# Live
ARCA_LIVE_USERNAME=
ARCA_LIVE_PASSWORD=
# App URL (no trailing slash)
APP_URL=https://yoursite.com
```

- `ARCA_BANK` — определяет base URL (idbank → `ipay.arca.am`, inecobank → `pg.inecoecom.am`)
- `ARCA_TEST_MODE=true` → test credentials + test URL
- `ARCA_TEST_MODE` ≠ `true` → live credentials + live URL

---

## 3. Callback URL

| Параметр | URL |
|----------|-----|
| **returnUrl** | `https://yoursite.com/api/v1/payments/arca/callback?order={orderId}` |

returnUrl передаётся в запросе `register.do`. Arca redirect пользователя на этот URL после оплаты. В query добавляем свой order ID для идентификации.

---

## 4. Workflow

1. Пользователь подтверждает заказ → создаётся Order + Payment (provider: `arca`, status: `pending`)
2. **register.do** — регистрация заказа в Arca, получаем `orderId` и `formUrl`
3. Redirect пользователя на `formUrl` — страница ввода карточных данных (на стороне банка)
4. Пользователь оплачивает (3DS если требуется)
5. Arca redirect пользователя на **returnUrl** с параметром `orderId`
6. **getOrderStatusExtended.do** — проверяем статус (не доверяем URL params)
7. `paymentState = DEPOSITED` → order `paid`, cart clear, EHDM print
8. Иначе → order `failed`, redirect на error page

---

## 5. API methods

### 5.1 register.do — регистрация заказа

**URL:** `{baseUrl}/register.do`

**Параметры (POST, form-data):**

| Параметр | Тип | Обязательный | Описание |
|----------|-----|-------------|----------|
| userName | string | Да | Логин от банка |
| password | string | Да | Пароль от банка |
| orderNumber | string | Да | Номер заказа в вашей системе (уникальный) |
| amount | integer | Да | Сумма в **минимальных единицах** (1000 AMD = 100000) |
| currency | string | Нет | ISO 4217 numeric: `051` (AMD), `840` (USD), `978` (EUR), `643` (RUB) |
| returnUrl | string | Да | URL возврата пользователя |
| description | string | Нет | Описание заказа |
| language | string | Нет | `hy` / `ru` / `en` |
| pageView | string | Нет | `MOBILE` / `DESKTOP` |
| jsonParams | string | Нет | `{"FORCE_3DS2":"true"}` для принудительного 3DS2 |
| clientId | string | Нет | ID клиента (для привязки карт) |

**Ответ:**

| Поле | Описание |
|------|----------|
| orderId | ID заказа в Arca (UUID) |
| formUrl | URL платёжной формы — redirect пользователя сюда |
| errorCode | `0` = успех |
| errorMessage | Описание ошибки (если есть) |

**Коды ошибок register.do:**
- `0` — успех
- `1` — заказ с таким номером уже зарегистрирован
- `3` — неизвестная валюта
- `4` — отсутствует обязательный параметр
- `5` — ошибка значения параметра
- `7` — системная ошибка

---

### 5.2 getOrderStatusExtended.do — проверка статуса

**URL:** `{baseUrl}/getOrderStatusExtended.do`

**Параметры (POST, form-data):**

| Параметр | Тип | Описание |
|----------|-----|----------|
| userName | string | Логин от банка |
| password | string | Пароль от банка |
| orderId | string | ID заказа от Arca (из register.do) |

**Ответ (ключевые поля):**

| Поле | Описание |
|------|----------|
| errorCode | `0` = успех |
| orderNumber | Номер заказа в вашей системе |
| orderStatus | Код статуса (integer) |
| actionCode | `0` = платёж прошёл |
| paymentAmountInfo.paymentState | Строковый статус |
| paymentAmountInfo.approvedAmount | Подтверждённая сумма |
| paymentAmountInfo.depositedAmount | Списанная сумма |

**Статусы:**

| paymentState | orderStatus | Описание |
|-------------|-------------|----------|
| CREATED | 0 | Заказ создан, не оплачен |
| APPROVED | 1 | Пред-авторизация (двухстадийный) |
| **DEPOSITED** | **2** | **Средства списаны — успех** |
| DECLINED | 3 | Отклонён |
| REVERSED | 4 | Отменён |
| REFUNDED | 5 | Возврат |

**Success:** `paymentState === "DEPOSITED"` (или `orderStatus === 2`).

---

### 5.3 reverse.do — отмена платежа

**URL:** `{baseUrl}/reverse.do`

**Параметры:** userName, password, orderId.

Используется для отмены платежа (аналог Ameriabank CancelPayment). Ограничения по времени — уточнить у банка.

---

### 5.4 refund.do — возврат средств

**URL:** `{baseUrl}/refund.do`

**Параметры:** userName, password, orderId, amount.

`amount` — сумма возврата в минимальных единицах. Не может превышать сумму транзакции. Для полного возврата — передать полную сумму.

---

### 5.5 registerPreAuth.do + deposit.do — двухстадийный платёж

1. `registerPreAuth.do` — блокировка средств (параметры как register.do)
2. `deposit.do` — списание средств (orderId, amount)

Используется для авторизации с последующим подтверждением (бронирование и т.д.).

---

## 6. Важные нюансы

### Сумма в минимальных единицах

В отличие от Ameriabank (передаёт сумму как есть), Arca требует сумму в **минимальных единицах валюты**:
- AMD: 1000 AMD → `100000` (x100, хотя у AMD нет «копеек»)
- USD: 10.50 USD → `1050`
- EUR: 25.00 EUR → `2500`

### returnUrl = browser redirect

Arca не отправляет server-to-server callback. Пользователь redirect через браузер на returnUrl. Это значит:
- `localhost` работает для тестов (Cloudflare Tunnel не нужен)
- Но если пользователь закроет браузер до redirect — callback не придёт
- Поэтому рекомендуется также проверять статус по расписанию (cron) для pending заказов

### Идентификация заказа в callback

Arca добавляет `orderId` (Arca UUID) в returnUrl params. Для идентификации своего заказа:
- Вариант 1: добавить свой order ID в returnUrl query (`?order={ourOrderId}`)
- Вариант 2: найти по Payment.providerTransactionId = arcaOrderId

---

## 7. Структура файлов (Next.js)

```
app/api/v1/payments/arca/
  init/route.ts        -- POST: register.do, вернуть { redirectUrl: formUrl }
  callback/route.ts    -- GET: getOrderStatusExtended.do, update order, redirect

lib/payments/arca/
  config.ts            -- ENV, base URL по ARCA_BANK
  client.ts            -- register, getOrderStatus, reverse, refund
  types.ts             -- response types, status codes
```

---

## 8. Checklist

- [ ] ENV: `ARCA_TEST_MODE`, `ARCA_BANK`, `ARCA_USERNAME`, `ARCA_PASSWORD` (test/live), `APP_URL`
- [ ] register.do: amount в **минимальных единицах**; returnUrl с order ID; `jsonParams: {"FORCE_3DS2":"true"}`
- [ ] Callback: **не доверять URL params** — всегда `getOrderStatusExtended.do`
- [ ] Success: `paymentState === "DEPOSITED"` или `orderStatus === 2`
- [ ] Admin: reverse.do (отмена), refund.do (возврат; amount ≤ transaction amount)
- [ ] Валюты: 051 (AMD), 840 (USD), 978 (EUR), 643 (RUB)
- [ ] Checkout: redirect на formUrl (не card modal)
- [ ] Cart clear: только после DEPOSITED
- [ ] EHDM: fiscal print после paid (только AMD)
- [ ] Для pending заказов: рассмотреть cron-проверку статуса (returnUrl может не прийти)

---

**Версия:** 1.0  
**Дата:** 2026-04-08
