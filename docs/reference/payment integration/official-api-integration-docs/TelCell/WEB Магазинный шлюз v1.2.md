Платёжная система Telcell
Форма оплаты для магазинов

Перенаправление пользователя на оплату счёта.

Для начала процедуры оплаты заказа через платёжную систему Telcell, необходимо перенаправить пользователя по платёжному URL системы, передав ряд параметров платежа.

URL: https://telcellmoney.am/invoices

 Обязательные параметры запроса:

Имя параметра	Описание
action	Всегда равно "PostInvoice"
issuer	Email магазина, от лица которого выставляется счёт
currency	Валюта счёта. Всегда равно "!!! Символ драм"
price	Сумма выставляемого счёта
product	Описание товара (кодируется в base64)
issuer_id	Идентификатор счёта в магазине (кодируется в base64)
valid_days	Число дней, в течении которых счёт действителен
ssn	SSN пользователя для сверки с данными платёжной системы. Опциональный параметр.
security_code	Хеш-подпись запроса. Формируется в виде: md5([секретный ключ магазина]+issuer+currency+price+product+issuer_id)
Параметры product и issuer_id передаются в хеш-функцию в том, виде, в котором они будут отправлены на сервер платёжной системы (base64).
lang	Язык локализации формы оплаты (am|en|ru)

Формирование хеш-подписи на PHP:

function getTelcellSecurityCode ($shop_key, $issuer, $currency, $price, $product, $issuer_id, $valid_days, $ssn) {
      return hash('md5', $shop_key . $issuer . $currency . $price . $product . $issuer_id . $valid_days . [$ssn]);
}

Пример HTML-формы перенаправления на оплату счёта:

<form target="_blank" action="https://telcellmoney.am/invoices" method="POST">
   <input type="hidden" name="issuer" value="test@tv4ds51.test">
   <input type="hidden" name="action" value="PostInvoice">
   <input type="hidden" name="currency" value="!!! Символ драм">
   <input type="hidden" name="price" value="200">
   <input type="hidden" name="product" value="0KLQvtCy0LDRgA==">
   <input type="hidden" name="issuer_id" value="MTU5MTY1NDY3Mw==">
   <input type="hidden" name="valid_days" value="10">
   <input type="hidden" name="lang" value="ru">
   <input type="hidden" name="security_code" value="50253a7fe62f22a38ff452f4a66b6f51">
   <input type="submit" value="Оплатить">
</form>


В случае необходимости оплаты нескольких счетов одной операцией, данные второго и следующих счетов передаются с последовательными постфиксами, начиная с 1.

Пример HTML-формы перенаправления на оплату нескольких счётов:

<form target="_blank" action="https://telcellmoney.am/invoices" method="POST">
   <input type="hidden" name="action" value="PostInvoice">
   <input type="hidden" name="issuer" value="test@tv4ds51.test">
   <input type="hidden" name="currency" value="!!! Символ драм">
   <input type="hidden" name="price" value="200">
   <input type="hidden" name="product" value="0KLQvtCy0LDRgA==">
   <input type="hidden" name="issuer_id" value="MTU5MTY1NDY3Mw==">
   <input type="hidden" name="valid_days" value="10">
   <input type="hidden" name="security_code" value="50253a7fe62f22a38ff452f4a66b6f51">
   <input type="hidden" name="issuer1" value="test@tv4ds51.test">
   <input type="hidden" name="currency1" value="!!! Символ драм">
   <input type="hidden" name="price1" value="100">
   <input type="hidden" name="product1" value="0KLQvtCy0LDRgA==">
   <input type="hidden" name="issuer_id1" value="MTU5MTY1NDY3Mw==">
   <input type="hidden" name="valid_days1" value="10">
   <input type="hidden" name="security_code1" value="1934aa8da13a14b38ff231a2c37a31ba">
   <input type="hidden" name="lang" value="ru">
   <input type="submit" value="Оплатить">
</form>



Получение статуса операции.


В результате завершения пользователем процедуры оплаты, платежная система Telcell выполняет коллбек-запрос методом POST на заранее установленный URL магазина. В запросе передаются следующие поля:

 
Имя параметра	Описание
invoice	Уникальный идентификатор счёта в системе Telcell
issuer_id	Идентификатор счёта в магазине (кодируется в base64)
payment_id	Уникальный идентификатор транзакции в системе Telcell
currency	Валюта счёта
sum	Сумма счёта
time	Время завершения операции в формате yyyy-MM-dd HH:mm:ss
status	Статус оплаты:
'PAID' — успех
'REJECTED' — отмена оплаты
checksum	Хеш-подпись запроса. Формируется в виде: md5([секретный ключ магазина]+invoice+issuer_id+payment_id+currency+sum+time+status)


Внимание! При получении коллбек-запросов со статусами операций, обязательна проверка хеш-подписи (checksum) на стороне магазина. Запрос с невалидной подписью не может являться основанием для продолжения обработки заказа на стороне магазина.

В случае, если статус оплаты в запросе от Telcell является успешным (status='PAID'), магазин фиксирует оплату заказа и продолжает дальнейшую работу по обслуживанию заказа. При отрицательном статусе операции (status='REJECTED'), заказ считается неоплаченным.

Обращаем внимание партнёров на то, что даже при успешном перенаправлении пользователя на оплату, коллбек от системы Telcell может не последовать вовсе. Это произойдёт в том, случае, если клиент проигнорирует выставленный счёт и не предпримет никаких значимых действий.

