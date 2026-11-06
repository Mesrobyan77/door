# Чеклист: подключение нового платёжного метода

> Универсальный пошаговый чеклист для интеграции любого платёжного провайдера. Без привязки к конкретному API — только структура и порядок действий.

---

## Перед началом

- [ ] Прочитать `01-GENERAL-RULES.md` (общие правила, URL-конвенция, статусы)
- [ ] Получить от провайдера: документацию API, test credentials, контакт техподдержки
- [ ] Определить тип интеграции: redirect / form POST / iframe

---

## 1. ENV переменные

- [ ] Добавить в `.env` и `.env.example`:
  - `{PROVIDER}_TEST_MODE=true`
  - Test credentials (ключи, токены, пароли)
  - Live credentials (отдельные переменные `{PROVIDER}_LIVE_*`)
- [ ] Убедиться, что `.env` в `.gitignore`
- [ ] Создать config-модуль: `lib/payments/{provider}/config.ts` — читает ENV, выбирает test/live

---

## 2. Callback URL

- [ ] Определить, какие URL нужны провайдеру (callback, success, fail, webhook)
- [ ] Зарегистрировать URL у провайдера (панель мерчанта или через API)
- [ ] URL по конвенции: `/api/v1/payments/{provider}/callback`, `/success`, `/fail`

---

## 3. Init endpoint

- [ ] Создать `POST /api/v1/payments/{provider}/init`
- [ ] Файл: `app/api/v1/payments/{provider}/init/route.ts`
- [ ] Логика:
  - Найти order в БД, проверить что `paymentStatus = pending`
  - Проверить валюту (если провайдер поддерживает только AMD — reject для других)
  - Создать/обновить payment record (provider, status: pending)
  - Вызвать API провайдера для регистрации платежа
  - Вернуть `{ redirectUrl }` или `{ formAction, formData }` для frontend

---

## 4. Callback handler

- [ ] Создать handler для каждого callback endpoint
- [ ] Файл: `app/api/v1/payments/{provider}/callback/route.ts` (+ success, fail если нужны)
- [ ] Логика:
  - Получить параметры из request (query / body)
  - Найти order в БД (по order ID, opaque, providerTransactionId)
  - **Проверить статус через API провайдера или checksum** (не доверять URL params)
  - Обновить order/payment status (`paid` / `failed`)
  - Idempotency: если order уже `paid` — не обновлять повторно
  - При `paid`: очистить корзину (logged-in user), вызвать EHDM print
  - Вернуть ответ в формате, который ожидает провайдер (plain text `OK`, 200, redirect)

---

## 5. Payment status update

- [ ] Модель Payment: provider, status, providerTransactionId, paidAt
- [ ] Модель Order: paymentStatus, paymentMethod
- [ ] Transitions: `pending → paid`, `pending → failed`, `paid → cancelled`, `paid → refunded`
- [ ] Event log: записывать каждое изменение статуса (кто, когда, с какого на какой)

---

## 6. Очистка корзины

- [ ] Cart clear вызывается только при `paymentStatus = paid`
- [ ] На success page: проверить статус заказа через API перед очисткой
- [ ] При `failed`: корзина остаётся — пользователь может повторить

---

## 7. Admin UI

- [ ] Список заказов: колонки Payment Status, Payment Method
- [ ] Детали заказа: блок Payment Info (статус, метод, transaction ID, дата)
- [ ] Кнопка Cancel (если провайдер поддерживает отмену)
- [ ] Кнопка Refund (если провайдер поддерживает возврат; полный/частичный)
- [ ] Кнопка «Mark as paid» (ручная отметка, когда callback не дошёл; вызвать EHDM print)
- [ ] История статусов — лог изменений

---

## 8. Профиль пользователя

- [ ] «Мои заказы»: payment status и payment method для каждого заказа
- [ ] Ссылка на фискальный чек (если создан)

---

## 9. Checkout UI

- [ ] Добавить провайдера в выбор способов оплаты
- [ ] Определить тип: redirect / form POST
- [ ] Для redirect: `window.location.href = redirectUrl`
- [ ] Для form POST: построить form и submit (Idram)
- [ ] Card modal **не нужен** для redirect-based провайдеров

---

## 10. Тестирование

- [ ] Настроить test credentials в `.env`
- [ ] Если callback server-to-server (Idram, Telcell, FastShift webhook): запустить Cloudflare Tunnel (`dev.neetrino.com`)
- [ ] Протестировать success flow (полный цикл)
- [ ] Протестировать fail flow
- [ ] Протестировать duplicate callback (idempotency)
- [ ] Проверить cart clearing после success
- [ ] Проверить payment status в admin и профиле
- [ ] Подробности: `03-TESTING-GUIDE.md`

---

## 11. EHDM (фискальный чек)

- [ ] В callback handler при `paid`: вызвать `printReceiptForOrder(orderId)` (fire-and-forget)
- [ ] При ручном «Mark as paid» в админке: тоже вызвать EHDM print
- [ ] Не печатать дважды (проверка существующего receipt)
- [ ] Только для заказов в AMD
- [ ] Подробности: `EHDM-INTEGRATION.md`

---

## 12. Финальная проверка

- [ ] Все ENV добавлены в `.env.example` (без значений)
- [ ] Документация провайдера: `{PROVIDER}-INTEGRATION.md` в этой папке
- [ ] Callback URL зарегистрированы у провайдера (test + production)
- [ ] Test/live переключение через `{PROVIDER}_TEST_MODE`
- [ ] Production: переключить `TEST_MODE=false`, обновить credentials

---

**Версия:** 1.0  
**Дата:** 2026-04-08
