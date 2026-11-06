# Payment Integration — документация

> Документация по интеграции платёжных систем для проектов на Next.js / NestJS. Каждый файл — самодостаточное руководство по конкретному провайдеру или теме.

---

## Порядок чтения

1. **01-GENERAL-RULES.md** — общие правила (URL-конвенция, статусы, безопасность, admin panel)
2. **02-NEW-METHOD-CHECKLIST.md** — чеклист при подключении нового провайдера
3. Руководство по конкретному провайдеру (см. ниже)
4. **03-TESTING-GUIDE.md** — тестирование (Cloudflare Tunnel, test flow, troubleshooting)

---

## Платёжные методы

### Карточные платежи (банки)

| Документ | Провайдер | Тип | Особенности |
|----------|-----------|-----|-------------|
| [AMERIABANK-INTEGRATION.md](AMERIABANK-INTEGRATION.md) | Ameriabank vPOS 3.1 | Карта | Собственный API; AMD/USD/EUR/RUB; Cancel 72h + Refund |
| [ARCA-INTEGRATION.md](ARCA-INTEGRATION.md) | Arca (IDBank, Inecobank, ACBA…) | Карта | Единый Arca API для нескольких банков; AMD/USD/EUR/RUB |

### Электронные кошельки

| Документ | Провайдер | Тип | Особенности |
|----------|-----------|-----|-------------|
| [IDRAM-INTEGRATION.md](IDRAM-INTEGRATION.md) | Idram | Кошелёк | Form POST; 2 server callback; checksum; только AMD |
| [TELCELL-INTEGRATION.md](TELCELL-INTEGRATION.md) | Telcell Money | Кошелёк | GET redirect; server callback; checksum; только AMD |
| [FASTSHIFT-INTEGRATION.md](FASTSHIFT-INTEGRATION.md) | FastShift | Кошелёк | Register order + GUID; Bearer token; только AMD |

### Фискальные чеки (post-payment)

| Документ | Система | Описание |
|----------|---------|----------|
| [EHDM-INTEGRATION.md](EHDM-INTEGRATION.md) | ЭҺДМ (ecrm.taxservice.am) | Электронные фискальные чеки ПЕК; client certificate; auto-print после оплаты |

---

## Общие документы

| Документ | Описание |
|----------|----------|
| [01-GENERAL-RULES.md](01-GENERAL-RULES.md) | URL-конвенция, payment status, cart clearing, ENV, безопасность, admin panel, checkout UI |
| [02-NEW-METHOD-CHECKLIST.md](02-NEW-METHOD-CHECKLIST.md) | Пошаговый чеклист для добавления нового платёжного метода (12 пунктов) |
| [03-TESTING-GUIDE.md](03-TESTING-GUIDE.md) | Cloudflare Tunnel (`dev.neetrino.com`), per-method test flow, что проверять, troubleshooting |

---

## URL-конвенция (кратко)

```
/api/v1/payments/{provider}/init       — POST, инициация платежа
/api/v1/payments/{provider}/callback   — GET/POST, callback от провайдера
/api/v1/payments/{provider}/success    — GET, redirect при успехе
/api/v1/payments/{provider}/fail       — GET, redirect при ошибке
```

Подробности: `01-GENERAL-RULES.md` → раздел 1.

---

## Официальная документация провайдеров

Оригинальные API-документы от провайдеров находятся в папке:

`payment integration/| Official doc for the API integrationm/`

- **AmeriaBank/** — vPOS 3.1 (MD, DOCX)
- **Arca/** — Merchant Manual 1.55.1.0 (MD, PDF)
- **IDram/** — Idram Merchant API (MD, PDF)
- **TelCell/** — WEB Магазинный шлюз v1.2, v2 (MD)
- **FastShift/** — PayByFastShift (MD)
- **EHDM/** — Integration manual (HTML)

---

## Рекомендуемый порядок интеграции

1. Ameriabank → 2. Arca (IDBank/Inecobank) → 3. Idram → 4. Telcell → 5. FastShift

---

**Версия:** 1.0  
**Дата:** 2026-04-08
