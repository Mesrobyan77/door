# Pay by FastShift (v1.0)



Հարցումները ուղարկում եք հետևյալ հղումով՝  https://merchants.fastshift.am/api/en/vpos/order/register


1. User chooses Pay by FastShift as payment method on partner's website
2. Partner registers an order with the amount to be paid (register order API)
3. Partner redirects the user to the url returned by FastShift as a result of register API call
4. User fills in phone number/ FastShift ID of their FastShift account, if the url is opened in mobile device it should suggest to open the Fast Shift app if it's installed
5. FastShift sends a push notification to the user specified in previous step or if the app is opened it will proceed to payment screen
6. User clicks on the push notification on their app, then confirms or rejects the order
7. FastShift redirects the user to the partner's website with the result of the process, if the callback_url is app-link/universal-link it will redirect to the url to open the app.


## Credentials
URL=https://{domain}/api/en/ \
Token={will be provided}

## API description
### Authorization
With each request the Authorization header should be provided.

```
Authorization: Bearer {Token}
```

### Register order API
API to register an order

**URL**

`/vpos/order/register`

**Method:**

`POST`

**Headers**

Content-Type: `application/json`\
Authorization: Bearer `{Token}`

**Request Body:**

```json
{
    "order_number": "00000000-0000-0000-0000-000000000000",
    "amount": 1000,
    "description": "Payment description",
    "callback_url": "https://partners-website.com/pay-by-fastshift/callback",
    "webhook_url": "https://partners-website.com/pay-by-fastshift/webhook",
    "username": "+3740000000",
    "user_ssn": "000000000",
    "check_evoca_account": true,
    "account_guid": "00000000-0000-0000-0000-000000000000",
    "external_order_id"
}: "12345678"
```

**Request parameters:**

| Name                   | Description                                                                                                                                                                                                                    | Type     | Is required |
|------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|----------| 
| `order_number`         | unique order number                                                                                                                                                                                                            | guid     | Yes      |
| `amount`               | the amount to be paid                                                                                                                                                                                                          | unsigned int | Yes      |
| `description`          | text shown on payment page                                                                                                                                                                                                     | string   | Yes      |
| `callback_url`         | it redirects to this url after the process is completed. passed parameters are: `status` and `order_number`, <br/>if it should redirect to your mobile app, you need to provide app-link/universal-link suported by your moible app | string   | Yes      |
| `webhook_url`          | it sends webhook to this url after the process is completed. passed parameters are: `status` and `order_number`                                                                                                                | string   | No       |
| `username`             | The username of Fastshift user (phone number)                                                                                                                                                                                  | string   | No       |
| `user_ssn`             | The ssn of current user, which will be compared with the fastshift users ssn                                                                                                                                                   | string   | No       |
| `check_evoca_account`  | If set to true, it will check if Fastshift user has evoca account or no                                                                                                                                                        | boolean  | No       |
|     `account_guid`     | If User has binded evoca account, send account_guied from resonse.                                                                                                                                                             | guid         | No       |
|`external_order_id` | The order Id from merchant side                                                                                                                                                                                                | string |No |

**Success Response:**

```json
{
    "status": "OK",
    "data": {
        "order": {
            "order_number": "00000000-0000-0000-0000-000000000000",
            "order_guid": "00000000-0000-0000-0000-000000000000",
            "amount": 1000,
            "description": "Payment description",
            "status": "pending",
            "created_at": "0000-00-00 00:00:00",
            "completed_at": null,
            "expires_at": "0000-00-00 00:00:00",
            "account_guid": "00000000-0000-0000-0000-000000000000",
            "external_order_id": "12345678"
        },
        "redirect_url": "https://fastshift..."
    }
}
```

**Response parameters:**

| Name                 | Description                                                                            | Type                                                                                                                                                                                                                                                  |
|----------------------|----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| 
| `order.order_number` | the order number                                                                       | guid                                                                                                                                                                                                                                                  |
| `order.order_guid`   | FastShift's unique identifier for the order                                            | guid                                                                                                                                                                                                                                                  |
| `order.amount`       | the order amount                                                                       | unsigned int                                                                                                                                                                                                                                          | 
| `order.description`  | the order description                                                                  | string                                                                                                                                                                                                                                                |
| `order.status`       | order status                                                                           | string (<br> &nbsp;&nbsp; `pending` - order registered, waiting for the user to pay<br> &nbsp;&nbsp; `completed` - successfully paid by the user<br>&nbsp;&nbsp;  `rejected` - user refused to pay<br>&nbsp;&nbsp; `expired` - order was expired<br>) |
| `order.created_at`   | datetime when the order was registered                                                 | string (yyyy-mm-dd HH:MM:SS)                                                                                                                                                                                                                          |
| `order.completed_at` | datetime when the order was completed, rejected or expired (null if status is pending) | string (yyyy-mm-dd HH:MM:SS)                                                                                                                                                                                                                          |
| `order.expires_at`   | datetime when the order is going to expire                                             | string (yyyy-mm-dd HH:MM:SS)                                                                                                                                                                                                                          |
| `order.account_guid`  | the binding guid of current user's evoca account.                                      | guid                                                                                                                                                                                                                                                  |
|`order.external_order_id`| the order id from merchant side | string|
| `redirect_url`       | url the user should be redirected to                                                   | string (url)                                                                                                                                                                                                                                          |


**Error Response:**\
Validation error

```
{
    "status": "INVALID_DATA",
    "errors": {
        "order_number": "Message describing what's wrong with order_number field (if is present)",
        "amount": "Message describing what's wrong with amount field (if is present)",
        "description": "Message describing what's wrong with description field (if is present)",
        "callback_url": "Message describing what's wrong with callback_url field (if is present)",
    }
}
```
OR
```
{
    "status": "ERROR",
    "message": "The reason why the order could not be registered"
}
```

###Check status API
API to check order status

**URL**

`/vpos/order/status/{order_number}`

**Method:**

`GET`

**Headers**

Content-Type: `application/json`\
Authorization: Bearer `{Token}`


**Request parameters:**

| Name        | Description           | Type | Is required |
| ------------- |-------------| ------------| ------------| 
| `order_number` | order's unique number       |  guid| Yes |


**Success response:**
```
{
    "status": "OK",
    "data": {
        "order": {
            "order_number": "00000000-0000-0000-0000-000000000000",
            "order_guid": "00000000-0000-0000-0000-000000000000",
            "amount": 1000,
            "description": "Payment description",
            "status": "completed",
            "created_at": "0000-00-00 00:00:00",
            "completed_at": "0000-00-00 00:00:00",
            "expires_at": "0000-00-00 00:00:00",
            "account_guid":"00000000-0000-0000-0000-000000000000"
        },
        "fastshift_id": "00000000"
    }
}
```


**Response parameters:**

| Name                 | Description                                                                                                                                                                                                                        | Type                         |
|----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------| 
| `order.order_number` | the order number                                                                                                                                                                                                                   | guid                         |
| `order.order_guid`   | FastShift's unique identifier for the order                                                                                                                                                                                        | guid                         |
| `order.amount`       | the order amount                                                                                                                                                                                                                   | unsigned int                 | 
| `order.description`  | the order description                                                                                                                                                                                                              | string                       |
| `order.status`       | order status (<br> &nbsp;&nbsp; `pending` - order registered, waiting for the user to pay<br> &nbsp;&nbsp; `completed` - successfully paid by the user<br>&nbsp;&nbsp;  `rejected` - user refused to pay<br>&nbsp;&nbsp; `expired` - order was expired<br>) | string                       |
| `order.created_at`   | datetime when the order was registered                                                                                                                                                                                             | string (yyyy-mm-dd HH:MM:SS) |
| `order.completed_at` | datetime when the order was completed, rejected or expired (null if status is pending)                                                                                                                                             | string (yyyy-mm-dd HH:MM:SS) |
| `order.expires_at`   | datetime when the order is going to expire                                                                                                                                                                                         | string (yyyy-mm-dd HH:MM:SS) |
| `order.account_guid`  |       the binding guid of current user's evoca account.                                                                                                                                                                              | guid                         |
|   `fastshift_id`                    |        the users fastshiftId                                                                                                                                                                                                                            |        string                      |



### Possible status values:

HTTP code 200, status `OK` - everything is ok\
HTTP code 422, status `INVALID_DATA` - some fields are filled wrong\
HTTP code 403, status `FORBIDDEN` - access denied\
HTTP code 401, status `UNAUTHORIZED` - Authorization is not passed\
HTTP code 400, status `ERROR` - logical errors with error message\
HTTP code 404, status `NOT_FOUND` - resource not found\
HTTP code 500, status `APP_ERROR` - system error

