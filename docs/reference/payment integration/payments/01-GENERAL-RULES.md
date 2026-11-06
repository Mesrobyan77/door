# Общие правила платёжных интеграций

> Этот документ описывает правила и конвенции, обязательные для **всех** платёжных методов. Перед интеграцией конкретного провайдера сначала прочитайте этот файл.

---

## 1. URL-конвенция

Единый паттерн для всех endpoint-ов:

| Назначение | Паттерн | Метод | Кто вызывает |
|------------|---------|-------|-------------|
| Инициация платежа | `/api/v1/payments/{provider}/init` | POST | Frontend |
| Callback / webhook | `/api/v1/payments/{provider}/callback` | GET / POST | Провайдер |
| Success redirect | `/api/v1/payments/{provider}/success` | GET | Провайдер (redirect) |
| Fail redirect | `/api/v1/payments/{provider}/fail` | GET | Провайдер (redirect) |

**Провайдеры:** `ameriabank`, `arca`, `idram`, `telcell`, `fastshift`.

**Next.js file structure:** `app/api/v1/payments/{provider}/{action}/route.ts`

Не все провайдеры используют все endpoint-ы. Ameriabank — один callback (success/fail определяется через GetPaymentDetails). Idram — callback + success + fail. FastShift — один callback (GET redirect + POST webhook).

---

## 2. Payment Status

Единый набор статусов для order/payment модели:

| Статус | Описание | Когда устанавливается |
|--------|----------|-----------------------|
| `pending` | Платёж инициирован, ожидает оплаты | При создании order/payment (init) |
| `paid` | Успешная оплата подтверждена | Callback: проверка через API/checksum |
| `failed` | Оплата не прошла | Callback: провайдер вернул ошибку |
| `cancelled` | Платёж отменён | Admin: CancelPayment / reverse.do |
| `refunded` | Средства возвращены (полностью или частично) | Admin: RefundPayment / refund.do |

**Где отображать:**
- Админ: список заказов (колонка), детали заказа (блок Payment Info)
- Профиль пользователя: «Мои заказы» — статус для каждого заказа

---

## 3. Очистка корзины (cart clear)

**Правило:** корзина очищается **только** при подтверждённом `paymentStatus = paid`.

1. Пользователь нажимает «Оплатить» → создаётся заказ (`pending`) → redirect к провайдеру
2. В этот момент корзина **не очищается** — товары остаются
3. Callback подтверждает успех → `paymentStatus = paid` → **очистить корзину**
4. Если платёж не прошёл → корзина **остаётся** — пользователь может повторить попытку

На success page: проверить `paymentStatus === 'paid'` перед очисткой (не доверять URL).

---

## 4. ENV-паттерн

Для каждого провайдера:

```
{PROVIDER}_TEST_MODE=true

# Test credentials
{PROVIDER}_...=
# Live credentials
{PROVIDER}_LIVE_...=

# Общее
APP_URL=https://yoursite.com
```

- `{PROVIDER}_TEST_MODE=true` → используются test credentials и test URLs
- `{PROVIDER}_TEST_MODE` ≠ `true` → используются live credentials
- `APP_URL` — base URL для callback/redirect (без trailing slash)

---

## 5. Безопасность

| Правило | Описание |
|---------|----------|
| **Не доверять URL params** | Callback URL params могут быть подделаны. Всегда проверять статус через API провайдера (GetPaymentDetails, getOrderStatusExtended.do) или checksum (Idram, Telcell) |
| **Idempotency** | Повторный callback с тем же order/payment не должен менять состояние. Если order уже `paid` — вернуть OK без повторного обновления |
| **Не раскрывать ошибки** | В callback response не возвращать внутренние сообщения об ошибках. Использовать 400/redirect без деталей |
| **Credentials только в ENV** | Никаких ключей/паролей в коде или репозитории. Только `.env` (`.env` в `.gitignore`) |
| **EHDM сертификаты** | `.crt`/`.key` файлы — за пределами репозитория. Path к ним через ENV |

---

## 6. Валюта

| Провайдер | Поддерживаемые валюты | Формат суммы |
|-----------|-----------------------|-------------|
| **Ameriabank** | AMD (051), USD (840), EUR (978), RUB (643) | Основные единицы (1000 AMD = `1000`) |
| **Arca** (IDBank, Inecobank…) | AMD (051), USD (840), EUR (978), RUB (643) | Минимальные единицы (1000 AMD = `100000`) |
| **Idram** | Только AMD | Основные единицы, десятичная точка |
| **Telcell** | Только AMD | Целое число (`Math.round`) |
| **FastShift** | Только AMD | Целое число (`Math.round`) |

В init endpoint: если провайдер поддерживает только AMD, а заказ в другой валюте — reject с ошибкой.

---

## 7. Checkout UI

| Провайдер | Тип интеграции | Card modal на нашей стороне |
|-----------|---------------|----------------------------|
| **Ameriabank** | Redirect → bank Pay page | Нет |
| **Arca** | Redirect → formUrl (bank page) | Нет |
| **Idram** | Form POST → banking.idram.am | Нет |
| **Telcell** | GET redirect → telcellmoney.am | Нет |
| **FastShift** | Redirect → redirect_url | Нет |

Ни один из провайдеров не требует ввода карточных данных на нашем сайте. Пользователь всегда перенаправляется на страницу провайдера.

---

## 8. EHDM (фискальный чек)

После **любого** успешного платежа (`paymentStatus → paid`) автоматически вызывается EHDM `/print` (fire-and-forget):
- Из callback handler-а каждого провайдера
- При ручном изменении статуса на `paid` в админке
- Только для заказов в AMD
- Не печатать дважды — проверить наличие существующего receipt

Подробности: `EHDM-INTEGRATION.md`.

---

## 9. Admin panel

### Список заказов

| Колонка | Содержание |
|---------|------------|
| Payment Status | `pending` / `paid` / `failed` / `cancelled` / `refunded` |
| Payment Method | `ameriabank` / `arca` / `idram` / `telcell` / `fastshift` |
| EHDM | Иконка: чек создан / нет |

### Детали заказа — блок Payment Info

- Статус оплаты
- Метод оплаты
- Provider transaction ID
- Дата оплаты
- Фискальный чек (если есть) — номер, QR, ссылка

### Кнопки управления

| Кнопка | Действие | Условие |
|--------|----------|---------|
| **Cancel** | Отменить платёж: Ameriabank `CancelPayment` (72ч), Arca `reverse.do` | `paymentStatus = paid`, в пределах допустимого срока |
| **Refund** | Возврат средств: Ameriabank `RefundPayment`, Arca `refund.do` | `paymentStatus = paid`; полный или частичный (сумма ≤ суммы транзакции) |
| **Mark as paid** | Ручная отметка оплаты (callback не дошёл) | `paymentStatus = pending / failed`; вызывает EHDM print |

### История статусов

Лог изменений payment status: кто изменил, когда, с какого статуса на какой, причина (callback / admin action / refund).

---

## 10. Профиль пользователя

Раздел «Мои заказы»:
- Payment status для каждого заказа
- Payment method
- Ссылка на фискальный чек (если создан)

---

## 11. Порядок интеграции

Рекомендуемый порядок подключения провайдеров:

1. **Ameriabank** — карточные платежи, собственный API (vPOS), самый полный по документации
2. **Arca** (IDBank / Inecobank) — карточные платежи через национальную систему ArCa
3. **Idram** — электронный кошелёк, 2 server-to-server callback, checksum
4. **Telcell** — электронный кошелёк, GET redirect + callback
5. **FastShift** — электронный кошелёк, register order + GUID

---

**Версия:** 1.0  
**Дата:** 2026-04-08
