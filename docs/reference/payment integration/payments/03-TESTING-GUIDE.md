# Тестирование платёжных интеграций

> Единый гайд по тестированию всех платёжных провайдеров: настройка окружения, Cloudflare Tunnel, test flow для каждого метода, что проверять, troubleshooting.

---

## 1. Общие принципы

- Все провайдеры поддерживают **test и production** режимы
- Переключение через ENV: `{PROVIDER}_TEST_MODE=true`
- Test режим использует тестовые credentials — реальные деньги не списываются
- Один и тот же код для test и production (разные credentials/URL)

---

## 2. Cloudflare Tunnel — публичный URL для localhost

Некоторые провайдеры отправляют server-to-server callback (POST на ваш URL). С `localhost` это не работает — нужен публичный туннель.

Мы используем **Cloudflare Tunnel** с постоянным тестовым доменом `dev.neetrino.com`.

### Кому нужен туннель

| Провайдер | Нужен туннель для теста | Причина |
|-----------|------------------------|---------|
| Ameriabank | Нет | BackURL = redirect через браузер |
| Arca | Нет | returnUrl = redirect через браузер |
| Idram | **Да** | RESULT_URL = server-to-server POST |
| Telcell | **Да** | RESULT_URL = server-to-server callback |
| FastShift | Частично | callback_url = redirect (работает без туннеля); webhook_url = server POST (нужен туннель) |

### Преимущества перед ngrok

- **Постоянный домен** `dev.neetrino.com` — не меняется при перезапуске
- Не нужно обновлять `.env` и перерегистрировать URL у провайдера после каждого запуска
- Бесплатно (в рамках Cloudflare)

### Настройка (один раз)

**Установка `cloudflared`:**

```bash
brew install cloudflare/cloudflare/cloudflared
cloudflared login
```

После `login` — авторизоваться в браузере, выбрать zone `neetrino.com`.

**Создание туннеля:**

```bash
cloudflared tunnel create dev-neetrino
cloudflared tunnel route dns dev-neetrino dev.neetrino.com
```

Это создаёт туннель и привязывает `dev.neetrino.com` к нему (выполняется один раз).

### Запуск

Терминал 1 — приложение:
```bash
npm run dev
```

Терминал 2 — туннель:
```bash
cloudflared tunnel run --url http://localhost:3000 dev-neetrino
```

После запуска `https://dev.neetrino.com` проксирует на `localhost:3000`.

### Настройка .env

```
APP_URL=https://dev.neetrino.com
```

URL **постоянный** — менять `.env` при перезапуске туннеля не нужно.

### Важно

- Оба процесса должны быть запущены: Next.js + cloudflared
- Открывать сайт для теста по `https://dev.neetrino.com` (не localhost) — чтобы callback URL-ы совпадали
- SSL обеспечивается Cloudflare автоматически
- Если туннель не стартует — проверить `cloudflared tunnel list` и что DNS-запись существует

---

## 3. Тестирование по провайдерам

### 3.1 Ameriabank

**Получить:** test ClientID, Username, Password — от Ameriabank.

**ENV:**
```
AMERIA_TEST_MODE=true
AMERIA_CLIENT_ID=...
AMERIA_USERNAME=...
AMERIA_PASSWORD=...
```

**Test base URL:** `https://servicestest.ameriabank.am/VPOS`

**Test flow:**
1. Checkout → выбрать Ameriabank → init
2. InitPayment → получить PaymentID → redirect на Pay page
3. Ввести тестовые карточные данные на странице банка
4. Банк redirect на callback URL (GET) с query params
5. Callback: вызвать GetPaymentDetails(paymentID) → проверить ResponseCode + PaymentState
6. Проверить: order `paid`, корзина очищена, EHDM receipt

**Туннель:** не нужен (BackURL = browser redirect, localhost работает).

**Тестовые карты:** запросить у банка (обычно предоставляют при выдаче test credentials).

---

### 3.2 Arca (IDBank / Inecobank)

**Получить:** test userName, password — от банка (IDBank, Inecobank и т.д.).

**ENV:**
```
ARCA_TEST_MODE=true
ARCA_USERNAME=...
ARCA_PASSWORD=...
```

**Test base URL:**
- IDBank: `https://ipaytest.arca.am:8445/payment/rest`
- Inecobank: `https://pg.inecoecom.am/payment/rest` (test credentials)

**Test flow:**
1. Checkout → выбрать Arca → init
2. register.do → получить formUrl → redirect
3. Ввести тестовые карточные данные
4. Arca redirect на returnUrl с orderId
5. Callback: вызвать getOrderStatusExtended.do → проверить paymentState = DEPOSITED
6. Проверить: order `paid`, корзина очищена, EHDM receipt

**Туннель:** не нужен (returnUrl = browser redirect).

---

### 3.3 Idram

**Получить:** test EDP_REC_ACCOUNT, SECRET_KEY — запросить у технического персонала Idram.

**ENV:**
```
IDRAM_TEST_MODE=true
IDRAM_REC_ACCOUNT=...
IDRAM_SECRET_KEY=...
```

**Form URL (test и live одинаковый):** `https://banking.idram.am/Payment/GetPayment`

**Test flow:**
1. Checkout → выбрать Idram → init → получить formAction + formData
2. Frontend submit form POST → banking.idram.am
3. Idram отправляет 2 POST на RESULT_URL:
   - (a) Precheck: `EDP_PRECHECK=YES` → ответить `OK` (plain text)
   - (b) Confirmation: с EDP_CHECKSUM → проверить checksum, ответить `OK`
4. Idram redirect пользователя на SUCCESS_URL / FAIL_URL
5. Проверить: order `paid`, корзина очищена, EHDM receipt

**Туннель:** **обязателен** (RESULT_URL = server-to-server POST).

**Регистрация URL у Idram:**

| Параметр | URL |
|----------|-----|
| RESULT_URL | `https://dev.neetrino.com/api/v1/payments/idram/callback` |
| SUCCESS_URL | `https://dev.neetrino.com/api/v1/payments/idram/success` |
| FAIL_URL | `https://dev.neetrino.com/api/v1/payments/idram/fail` |

---

### 3.4 Telcell

**Получить:** test shop_id, shop_key — от Telcell.

**ENV:**
```
TELCELL_TEST_MODE=true
TELCELL_SHOP_ID=...
TELCELL_SHOP_KEY=...
```

**API URL (test и live одинаковый):** `https://telcellmoney.am/invoices`

**Test flow:**
1. Checkout → выбрать Telcell → init → получить redirectUrl
2. Redirect → telcellmoney.am → оплата
3. Telcell отправляет callback на RESULT_URL (GET/POST): issuer_id, status, checksum
4. Проверить checksum, status === "PAID" → order paid
5. Telcell redirect пользователя на REDIRECT_URL
6. Проверить: order `paid`, корзина очищена, EHDM receipt

**Туннель:** **обязателен** (RESULT_URL = server callback).

**Регистрация URL у Telcell:**

| Параметр | URL |
|----------|-----|
| RESULT_URL | `https://dev.neetrino.com/api/v1/payments/telcell/callback` |
| REDIRECT_URL | `https://dev.neetrino.com/api/v1/payments/telcell/redirect` |

---

### 3.5 FastShift

**Получить:** test Bearer Token — от FastShift.

**ENV:**
```
FASTSHIFT_TEST_MODE=true
FASTSHIFT_TOKEN=...
```

**Register URL (test и live одинаковый):** `https://merchants.fastshift.am/api/en/vpos/order/register`

**Test flow:**
1. Checkout → выбрать FastShift → init
2. Register order → получить redirect_url → redirect
3. Пользователь оплачивает
4. FastShift redirect на callback_url (GET) с status, order_number
5. Callback: проверить status через FastShift Status API (GET `/vpos/order/status/{order_number}`)
6. Проверить: order `paid`, корзина очищена, EHDM receipt

**Туннель:** нужен только для webhook_url (POST). callback_url (GET redirect) работает с localhost.

---

## 4. Что проверять (все провайдеры)

- [ ] **Success flow** — полный цикл: checkout → оплата → callback → order paid → cart clear → EHDM
- [ ] **Fail flow** — отклонённая оплата → order failed → корзина остаётся
- [ ] **Duplicate callback** — повторный callback не меняет состояние (idempotency)
- [ ] **Неверный checksum** (Idram, Telcell) — callback отклоняется
- [ ] **Несуществующий order** — callback возвращает ошибку без утечки данных
- [ ] **Cart clearing** — только при paid, не при failed
- [ ] **Payment status в admin** — корректное отображение в списке и деталях
- [ ] **Payment status в профиле** — корректное отображение для пользователя
- [ ] **EHDM print** — фискальный чек создан при paid (только AMD)
- [ ] **Cancel / Refund** (если поддерживается) — через admin кнопки

---

## 5. Troubleshooting

| Проблема | Причина | Решение |
|----------|---------|---------|
| RESULT_URL не доходит | Cloudflare Tunnel не запущен или DNS не настроен | Проверить `cloudflared tunnel list`, убедиться что `dev.neetrino.com` резолвится |
| Checksum mismatch (Idram) | Неверный порядок полей в MD5 | Порядок: `EDP_REC_ACCOUNT:EDP_AMOUNT:SECRET_KEY:EDP_BILL_NO:EDP_PAYER_ACCOUNT:EDP_TRANS_ID:EDP_TRANS_DATE` |
| Checksum mismatch (Telcell) | Неверный порядок полей | Порядок: `shop_key+invoice+issuer_id+payment_id+currency+sum+time+status` |
| Order not found (Telcell) | issuer_id приходит в base64 или plain | Пробовать: raw → decoded → number(decoded) → number(raw) |
| GetPaymentDetails ResponseCode != "00" (Ameriabank) | ResponseCode может быть "00 : Payment..." | Использовать `startsWith("00")` |
| PaymentState приходит числом (Ameriabank) | API возвращает 2 / 4 вместо строки | Нормализовать: `2` = DEPOSITED = success |
| Arca сумма неверная | Не умножена на 100 | Сумма в минимальных единицах: 1000 AMD = 100000 |
| FastShift order_number не найден | GUID формат не совпадает | Валидировать UUID формат |
| Туннель не стартует | Туннель не создан или не авторизован | `cloudflared tunnel list` → `cloudflared login` → `cloudflared tunnel create dev-neetrino` |
| SSL ошибка при callback | Cloudflare сертификат не выпущен | Подождать 1–2 мин после первого запуска; проверить DNS в Cloudflare dashboard |

---

**Версия:** 1.1  
**Дата:** 2026-04-08
