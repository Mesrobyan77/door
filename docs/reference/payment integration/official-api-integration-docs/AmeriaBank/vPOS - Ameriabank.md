AmeriaBank vPOS 3.1
API Protocol Description

Introduction 
General principles of interactive protocol operation
General structure of the request and the response 
	1.  Function of getting unique payment ID: InitPayment 
	2.  Function of getting payment information: GetPaymentDetails 
3.  Payment confirmation function: ConfirmPayment 
4.  Payment cancellation function: CancelPayment
5.  Function of partial refund of the sum: RefundPayment 
6.  Function of getting information about all payments: GetTransactionList
7.  Function of getting information about problem transactions: GetProblemTransactions
Binding transactions 
8.   Function of making binding payment transactions: MakeBindingPayment 
9.   Function of receiving information about bindings: GetBindings
10. Bindings deactivation function: DeactivateBindings
11. Bindings activation function: ActivateBindings
Table 1. Codes and description of operations  
Table 2. Payment state values






	










Introduction
This is a technical specification containing information required for connection and further use of AmeriaBank vPOS 3.1 payment system.
It is necessary to apply to Ameriabank to get connected to the system.

General principles 
API interaction is performed via data exchange through Rest (except administration page: SOAP) protocol by the following addresses:

URL	Description
https://servicestest.ameriabank.am/VPOS/
Main payment system address  
https://testpayments.ameriabank.am/Admin/webservice/TransactionsInformationService.svc?wsdl
Address for getting information about transactions 


Workflow

1.	The Client connects to the merchant to create an order.
2.	Once the order is confirmed by the client, merchant’s system registers it in the payment gateway. 
3.	In response to registration request the payment gateway sends the unique ID of the order.
4.	Merchant’s system redirects to the payment form. 
5.	The Client fills in the received form and sends the data to the processing center server.
6.	Processing center system checks whether the card is registered in 3DSecure (SecureCode) and redirects the client to ACS (Access Control Server).
7.	Once the form in ACS is completed and the payment is made client’s browser redirects to back URL (specified when registering the order by the merchant). 
8.	Client’s browser sends a “payment results page” request to the merchant. 
9.	Based on order number Merchant’s system sends an “order payment status” request to the payment gate. 
10.	Payment gate returns the payment status and other payment data. 
11.	Merchants system displays payment results page in the client’s browser. 





General Structure of the Request and the Response 


1.   Function of generating unique payment ID: https://servicestest.ameriabank.am/VPOS/api/VPOS/InitPayment
Request parameters  InitPaymentRequest
Parameter 	Description	Data Type	Requirement
ClientID	Merchant ID	string	Yes
Username	Merchant user name	string	Yes
Password	Merchant password	string	Yes
Currency 	Transaction currency (ISO code)  
051 - AMD (by default) 
978 - EUR
840 - USD
643 - RUB	string	No
Description
	Description of the transaction	string	Yes
OrderID	Unique ID of the transaction	integer	Yes
Amount	Payment amount	decimal	Yes
BackURL	Address on the merchant’s server for returning after payment
	string	No
Opaque	Additional data 	string	No
CardHolderID	Unique ID for binding transactions (is used when needs to do card binding, in other cases it is not required)	string	No
Timeout	Session duration in seconds. Cannot exceed 1200 seconds. If the parameter is not specified, the default value (1200 seconds - 20 minutes) will be used.	integer	No





Request sample
application/json
{
  "ClientID": "sample string 1",
  "Amount": 2.0,
  "OrderID": 3,
  "BackURL": "sample string 4",
  "Username": "sample string 5",
  "Password": "sample string 6",
  "Description": "sample string 7",
  "Currency": "sample string 8",
  "CardHolderID": "sample string 9",
  "Opaque ": "sample string 10",
  "Timeout": 110,
}

application/xml
<InitPaymentRequest>
  <ClientID>sample string 1</ClientID>
  <Amount>2</Amount>
  <OrderID>3</OrderID>
  <BackURL>sample string 4</BackURL>
  <Username>sample string 5</Username>
  <Password>sample string 6</Password>
  <Description>sample string 7</Description>
  <Currency>sample string 8</Currency>
  <CardHolderID>sample string 9</CardHolderID>
  <Opaque>sample string 10</Opaque>
  <Timeout>110</Timeout>
</InitPaymentRequest>

Response  InitPaymentResponse
Parameter 	Description	Data Type	Requirement
PaymentID	Unique payment ID 	string	
ResponseCode	Operation response code (successful=1)	integer	
ResponseMessage
	Description of operation response 	string	
Response sample
application/json
{
  "PaymentID": "sample string 1",
  "ResponseCode": 2,
  "ResponseMessage": "sample string 3"
}
application/xml
<InitPaymentResponse>
  <PaymentID>sample string 1</PaymentID>
  <ResponseCode>2</ResponseCode>
  <ResponseMessage>sample string 3</ResponseMessage>
</InitPaymentResponse>








After this the merchant shall redirect the user to:
https://servicestest.ameriabank.am/VPOS/Payments/Pay?id=@id&lang=@lang 
URL parameters
Parameter 	Description	Data Type	Requirement
id	Unique payment ID	string	Yes
lang	Interface language:
am-Armenian
ru-Russian
en-English	string	No

After making the payment, the system redirects to the merchant’s server by backURL, by sending the following parameters.


Parameter 	Description	Data Type	Requirement
orderID	Unique ID of the transaction	string	Yes
resposneCode	Operation response code (successful=00)	string	Yes
paymentID	Unique payment ID	string	Yes
opaque	Additional data	string	Yes

To complete the transaction it is necessary to send “GetPaymentDetails” request.

















2.   Function of getting payment information:  
https://servicestest.ameriabank.am/VPOS/api/VPOS/GetPaymentDetails

Request parameters  PaymentDetailsRequest
Parameter 	Description	Data Type	Requirement
PaymentID	Payment ID	string	Yes
Username	Merchant user name	string	Yes
Password	Merchant password	string	Yes

Request sample
Հարցման օրինակ
application/json
{
  "PaymentID": "sample string 1",
  "Username": "sample string 2",
  "Password": "sample string 3"
}
application/xml
<PaymentDetailsRequest>
  <PaymentID>sample string 1</PaymentID>
  <Username>sample string 2</Username>
  <Password>sample string 3</Password>
</PaymentDetailsRequest>









Response PaymentDetailsResponse
Parameter 	Description	Data Type	Requirement
Amount	Transaction amount	decimal	
ApprovedAmount	Amount blocked on the client’s card	decimal	
ApprovalCode	Transaction authorization code	string	
CardNumber	Masked card number 	string	
ClientName	Cardholder name	string	
ClientEmail	Cardholder’s email address	string	
Currency	Transaction currency	string	
DateTime	Transaction date	string	
DepositedAmount	Amount deposited to the merchant’s account	decimal	
Description	Information about the transaction	string	
MerchantId	Merchant ID	string	
Opaque	Additional data	string	
OrderID	Unique ID of the transaction	integer	
PaymentState	Payment state	string	
PaymentType	Վճարման տիպ
5- MainRest (arca)
7- PayPal
6- Binding	PaymentsEnum

ResponseCode	Operation response code (successful=00) 
(Table 1.)	string	
rrn	Unique code of the transaction	string	
TerminalId	Merchant’s terminalid 	string	
TrxnDescription	Description of the transaction	string	
OrderStatus	Status code of the payment 
(Table 2.)	integer	
RefundedAmount	Amount transferred back to the card 	decimal	
CardHolderID
	Unique ID for binding transactions	string	
MDOrderID	Payment system identifier	string	
PrimaryRC	Main code		
ExpDate	Card expiration date 	string	
ProcessingIP	IP address	string	
BindingID	Binding identifier	string	
ActionCode	Action code	string	
ExchangeRate	Exchange rate	decimal	

Response sample
application/json
{
  "Amount": 1.0,
  "ApprovedAmount": 2.0,
  "ApprovalCode": "sample string 3",
  "CardNumber": "sample string 4",
  "ClientName": "sample string 5",
  "ClientEmail": "sample string 6",
  "Currency": "sample string 7",
  "DateTime": "sample string 8",
  "DepositedAmount": 9.0,
  "Description": "sample string 10",
  "MDOrderID": "sample string 11",
  "MerchantId": "sample string 12",
  "TerminalId": "sample string 13",
  "OrderID": "sample string 14",
  "PaymentState": "sample string 15",
  "PaymentType": 0,
  "PrimaryRC": "sample string 16",
  "ResponseCode": "sample string 17",
  "ExpDate": "sample string 18",
  "ProcessingIP": "sample string 19",
  "OrderStatus": "sample string 20",
  "CardHolderID": "sample string 21",
  "BindingID": "sample string 22",
  "RefundedAmount": 23.0,
  "Opaque": "sample string 24",
  "TrxnDescription": "sample string 25",
  "rrn": "sample string 26",
  "ActionCode": "sample string 27",
  "ExchangeRate": 28.0
}

application/xml

<PaymentDetailsResponse>
  <Amount>1</Amount>
  <ApprovedAmount>2</ApprovedAmount>
  <ApprovalCode>sample string 3</ApprovalCode>
  <CardNumber>sample string 4</CardNumber>
  <ClientName>sample string 5</ClientName>
  <ClientEmail>sample string 6</ClientEmail>
  <Currency>sample string 7</Currency>
  <DateTime>sample string 8</DateTime>
  <DepositedAmount>9</DepositedAmount>
  <Description>sample string 10</Description>
  <MDOrderID>sample string 11</MDOrderID>
  <MerchantId>sample string 12</MerchantId>
  <TerminalId>sample string 13</TerminalId>
  <OrderID>sample string 14</OrderID>
  <PaymentState>sample string 15</PaymentState>
  <PaymentType>None</PaymentType>
  <PrimaryRC>sample string 16</PrimaryRC>
  <ResponseCode>sample string 17</ResponseCode>
  <ExpDate>sample string 18</ExpDate>
  <ProcessingIP>sample string 19</ProcessingIP>
  <OrderStatus>sample string 20</OrderStatus>
  <CardHolderID>sample string 21</CardHolderID>
  <BindingID>sample string 22</BindingID>
  <RefundedAmount>23</RefundedAmount>
  <Opaque>sample string 24</Opaque>
  <TrxnDescription>sample string 25</TrxnDescription>
  <rrn>sample string 26</rrn>
  <ActionCode>sample string 27</ActionCode>
  <ExchangeRate>28</ExchangeRate>
</PaymentDetailsResponse>


3.   Payment confirmation function: https://servicestest.ameriabank.am/VPOS/api/VPOS/ConfirmPayment

Request parameters ConfirmPaymentRequest
Parameter 	Description	Data Type	Requirement
PaymentID	Payment ID	string	Yes
Username	Merchant user name	string	Yes
Password	Merchant password	string	Yes
Amount	Confirmed amount	decimal	Yes

Request sample
application/json
{
  "PaymentID": "sample string 1",
  "Username": "sample string 2",
  "Password": "sample string 3",
  "Amount": 10
}


application/xm
<ConfirmRequest>
  <PaymentID>sample string 1</PaymentID>
  <Username>sample string 2</Username>
  <Password>sample string 3</Password>
</ConfirmRequest>
Response ConfirmPaymentResponse
Parameter 	Description	Data Type	Requirement
ResponseCode	Operation response code (successful=00) 
(Table  1.)	string	
ResponseMessage	Description of operation response 	string	
Opaque	Additional data	string	

Response sample

application/json

{
  "ResponseCode": "sample string 1",
  "ResponseMessage": "sample string 2",
  "Opaque": "sample string 3"
}

application/xml

<ConfirmResponse>
  <ResponseCode>sample string 1</ResponseCode>
  <ResponseMessage>sample string 2</ResponseMessage>
  <Opaque>sample string 3</Opaque>
</ConfirmResponse>
4.   Payment cancellation function: 
https://servicestest.ameriabank.am/VPOS/api/VPOS/CancelPayment

Attention: this function is available within 72 hours starting from payment initialization 
Request parameters  CancelPaymentRequest
Parameter 	Description	Data Type	Requirement
PaymentID	Payment ID	string	Yes
Username	Merchant user name	string	Yes
Password	Merchant password	string	Yes

Request sample

application/json

{
  "PaymentID": "sample string 1",
  "Username": "sample string 2",
  "Password": "sample string 3"
}

application/xml

<CancelPaymentRequest>
  <PaymentID>sample string 1</PaymentID>
  <Username>sample string 2</Username>
  <Password>sample string 3</Password>
</CancelPaymentRequest>







Response CancelPaymentResponse
Parameter 	Description	Data Type	Requirement
Opaque	Additional data	string	
ResponseCode	Operation response code (successful=00) 
(Table 1.)	string	
ResponseMessage	Description of operation response 	string	

Response sample

application/json

{
  "ResponseCode": "sample string 1",
  "ResponseMessage": "sample string 2",
  "Opaque": "sample string 3"
}

application/xml

<CancelPaymentResponse>
  <ResponseCode>sample string 1</ResponseCode>
  <ResponseMessage>sample string 2</ResponseMessage>
  <Opaque>sample string 3</Opaque>
</CancelPaymentResponse>


Payments may be: 
•	single-stage: when the payment amount is immediately withdrawn from the buyer’s account 
•	two-stage: when the payment amount is first blocked on the buyer’s account and then at the second stage is withdrawn from the account 
In case of two-stage payment, it is necessary to send “Confirmation” request for performing the second stage and withdrawing the amount from the buyer’s (cardholder’s) account. To cancel the payment and to return the amount back to the buyer’s (cardholder’s) account it is necessary to send “CancelPayment” request.

5.   Partial refund function: 
https://servicestest.ameriabank.am/VPOS/api/VPOS/RefundPayment

Request parameters  RefundPaymentRequest
Parameter 	Description	Data Type	Requirement
PaymentID	Payment ID	string	Yes
Username	Merchant user name	string	Yes
Password	Merchant password	string	Yes
Amount	Amount to be returned to the buyer’s (cardholder’s) account 
This amount shall not exceed the transaction amount.	decimal	Yes


Request sample

application/json

{
  "PaymentID": "sample string 1",
  "Username": "sample string 2",
  "Password": "sample string 3",
  "Amount": 4.0
}

application/xm

<RefundRequest>
  <PaymentID>sample string 1</PaymentID>
  <Username>sample string 2</Username>
  <Password>sample string 3</Password>
  <Amount>4</Amount>
</RefundRequest>
Response RefundPaymentResponse
Parameter 	Description	Data Type	Requirement
Opaque	Additional data	string	
ResponseCode	Operation response code (successful=00) 
(Table 1.)	string	
ResponseMessage	Description of operation response 	string	

Response sample

application/json

{
  "ResponseCode": "sample string 1",
  "ResponseMessage": "sample string 2",
  "Opaque": "sample string 3"
}

application/xml

<RefundResponse>
  <ResponseCode>sample string 1</ResponseCode>
  <ResponseMessage>sample string 2</ResponseMessage>
  <Opaque>sample string 3</Opaque>
</RefundResponse>
6.   Function of getting information about all payments: GetTransactionList
Request parameters  TransactionClient
Parameter 	Description	Data Type	Requirement
ClientID	Merchant ID	string	Yes
Username	Merchant user name	string	Yes

Password	Merchant password	string	Yes
StartDate	List of transactions from (format: yyyy/MM/dd HH:mm)	string	Yes
EndDate	List of transactions till (format: yyyy/MM/dd HH:mm)
	string	Yes

Request sample

<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <Action s:mustUnderstand="1" xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://payments.ameriabank.am/ITransactionsInformationService/ITransactionsInformationService/GetTransactionList</Action>
  </s:Header>
  <s:Body>
    <GetTransactionList xmlns="http://payments.ameriabank.am/ITransactionsInformationService">
      <transclient xmlns:d4p1="payments.ameriabank.am/TransactionClient" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <d4p1:ClientID>83D64FD0-594E-456F-BAF9-3E3135E37639</d4p1:ClientID>
        <d4p1:EndDate>2015/05/01 14:30</d4p1:EndDate>
        <d4p1:Password>lazY2k</d4p1:Password>
        <d4p1:StartDate>2015/05/01 14:18</d4p1:StartDate>
        <d4p1:Username>3d19541048</d4p1:Username>
      </transclient>
    </GetTransactionList>
  </s:Body>
</s:Envelope>
Response TransactionFields
Parameter 	Description	Data Type	Requirement
Amount	Transaction amount	decimal	
ApproveAmount	Amount blocked on cardholder's account	decimal	
AuthCode	Transaction authorization code  	string	
CardNumber	Masked card number 	string	
ClientName	Cardholder name	string	
Currency	Transaction currency	string	
DepositAmount	Amount deposited to the merchant’s account	decimal	
Descr	Information about the transaction	string	
ErrorMessage	Description of the error	string	
Opaque	“Opaque” filed value 	string	
OperDate	Transaction date	string	
OrderID	Unique ID of the transaction	string	
PaymentID	Unique ID of the payment 	string	
PaymentState	Payment state 	string	
PaymentType  	Payment type  
1- Virtual Arca
3- Visa, MasterCard, Arca (epay)
5 - Visa, MasterCard, Arca (ipay)
6- Binding	integer	
RRN	RRN field value  	string	
RespCode	Operation response code (successful=00) 
(Table 1.)	string	
Stan	“Stan” filed value  	string	
TrxnDetails	Description of the transaction	string	



Response sample

<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header />
  <s:Body>
    <GetTransactionListResponse xmlns="http://payments.ameriabank.am/ITransactionsInformationService">
      <GetTransactionListResult xmlns:a="payments.ameriabank.am/TransactionFields" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <a:PaymentFields>
          <a:Amount>5.00</a:Amount>
          <a:ApproveAmount>5.00</a:ApproveAmount>
          <a:AuthCode>422841</a:AuthCode>
          <a:CardNumber>408306**3143</a:CardNumber>
          <a:ClientName>orange.com</a:ClientName>
          <a:Currency>051</a:Currency>
          <a:DepositAmount>0.00</a:DepositAmount>
          <a:Descr i:nil="true" />
          <a:ErrorMessage i:nil="true" />
          <a:Opaque>Test</a:Opaque>
          <a:OperDate>Wed Mar 18 00:53:25 AMT 2</a:OperDate>
          <a:OrderID>58554654</a:OrderID>
          <a:PaymentID>b3201a82-dc65-430c-9c46-d1bf294c5770</a:PaymentID>
          <a:PaymentState>4</a:PaymentState>
          <a:PaymentType>3</a:PaymentType>
          <a:RRN>-118-94-50-53117-22-374393121252118-118106-36_p1</a:RRN>
          <a:RespCode>00 : Payment Successfully Completed</a:RespCode>
          <a:Stan />
          <a:TrxnDetails>This is orderid=58554654</a:TrxnDetails>
        </a:PaymentFields>
        </GetTransactionListResult>
    </GetTransactionListResponse>
  </s:Body>
</s:Envelope>

7.   Function of getting information about problem transactions:  GetProblemTransactions
Request parameters TransactionClient
Parameter 	Description	Data Type	Requirement
ClientID	Merchant ID	string	Yes
Username	Merchant user name	string	Yes
Password	Merchant password	string	Yes
EndDate	List of transactions from (format: yyyy/MM/dd HH:mm)	string	Yes
StartDate	List of transactions till (format: yyyy/MM/dd HH:mm)
	string	Yes

Request sample

<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <Action s:mustUnderstand="1" xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://payments.ameriabank.am/ITransactionsInformationService/ITransactionsInformationService/GetProblemTransactions</Action>
  </s:Header>
  <s:Body>
    <GetProblemTransactions xmlns="http://payments.ameriabank.am/ITransactionsInformationService">
      <transclient xmlns:d4p1="payments.ameriabank.am/TransactionClient" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <d4p1:ClientID>83D64FD0-594E-456F-BAF9-3E3135E37639</d4p1:ClientID>
        <d4p1:EndDate>2015/05/01 14:30</d4p1:EndDate>
        <d4p1:Password>lazY2k</d4p1:Password>
        <d4p1:StartDate>2015/05/01 14:18</d4p1:StartDate>
        <d4p1:Username>3d19541048</d4p1:Username>
      </transclient>
    </GetProblemTransactions>
  </s:Body>
</s:Envelope>
Response ProblemTransactions
Parameter 	Description	Data Type	Requirement
CardNumber	Card number	string	
ErrorMessage	Description of the error	string	
OrderID	Unique ID of the transaction 	integer	
PaymentDate	Transaction date	string	
PaymentSum	Transaction amount	decimal	


Response sample


<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <Action s:mustUnderstand="1" xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://payments.ameriabank.am/ITransactionsInformationService/ITransactionsInformationService/GetProblemTransactions</Action>
  </s:Header>
  <s:Body>
    <GetProblemTransactions xmlns="http://payments.ameriabank.am/ITransactionsInformationService">
      <transclient xmlns:d4p1="payments.ameriabank.am/TransactionClient" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <d4p1:ClientID>83D64FD0-594E-456F-BAF9-3E3135E37639</d4p1:ClientID>
        <d4p1:EndDate>2015/05/01 14:30</d4p1:EndDate>
        <d4p1:Password>lazY2k</d4p1:Password>
        <d4p1:StartDate>2015/05/01 14:18</d4p1:StartDate>
        <d4p1:Username>3d19541048</d4p1:Username>
      </transclient>
    </GetProblemTransactions>
  </s:Body>
</s:Envelope>

 
Binding Transactions 

Binding transactions enable the merchant to process the buyer’s recurrent payments without entering the payment card data each time. The user who has once entered card data and made a successful payment can make further payments without entering payment card details.
To bind the buyer’s card the merchant each time has to send unique CardHolderID as described above.  

8.   Function of making binding transactions: 
https://servicestest.ameriabank.am/VPOS/api/VPOS/MakeBindingPayment
Request parameters  MakeBindingPaymentRequest
Parameter 	Description	Data Type	Requirement
ClientID	Merchant ID	string	Yes
Username	Merchant user name	string	Yes
Password	Merchant password	string	Yes
Currency 	Transaction currency (ISO code) 
051 - AMD (by default) 
978 - EUR
840 - USD
643 - RUB	string	No
Description
	Description of the transaction	string	Yes
OrderID	Unique code of the transaction	integer	Yes
Amount	Payment amount	decimal	Yes
Opaque	Additional data	string	No
CardHolderID	Unique ID for binding transactions	string	Yes
BackURL	Առևտրային կետի հասցե՝ վճարումից հետո հետ վերադառնալու համար	string	Yes
PaymentType	Վճարման տիպ
5- MainRest (arca)
7- PayPal
6- Binding	PaymentsEnum
Yes




Request sample

application/json
{
  "ClientID": "sample string 1",
  "Username": "sample string 2",
  "Password": "sample string 3",
  "CardHolderID": "sample string 4",
  "Amount": 5.0,
  "OrderID": 6,
  "BackURL": "sample string 7",
  "PaymentType": 0,
  "Description": "sample string 8",
  "Currency": "sample string 9",
  "Opaque": "sample string 10"
}

application/xml
<MakeBindingPaymentRequest>
  <ClientID>sample string 1</ClientID>
  <Username>sample string 2</Username>
  <Password>sample string 3</Password>
  <CardHolderID>sample string 4</CardHolderID>
  <Amount>5</Amount>
  <OrderID>6</OrderID>
  <BackURL>sample string 7</BackURL>
  <PaymentType>None</PaymentType>
  <Description>sample string 8</Description>
  <Currency>sample string 9</Currency>
  <Opaque>sample string 10</Opaque>
</MakeBindingPaymentRequest>
Response MakeBindingPaymentResponse
Parameter 	Description	Data Type	Requirement
PaymentID	Payment ID	string	
Amount	Transaction amount	decimal	
ApprovedAmount	Amount blocked on the client’s card	decimal	
ApprovalCode	Transaction authorization code	string	
CardNumber	Masked card number 	string	
ClientName	Cardholder name	string	
Currency	Transaction currency	string	
DateTime	Transaction date	string	
DepositedAmount	Amount deposited to the merchant’s account	decimal	
Description	Information about the transaction	string	
MDOrderID	Payment system identifier	string	
MerchantId	Merchant ID	string	
Opaque	Additional data	string	
OrderID	Unique ID of the transaction	integer	
PaymentState	Payment state	string	
PaymentType	Payment Type
5- MainRest (arca)
7- PayPal
6- Binding	PaymentsEnum

PrimaryRC	Main code	string	
ResponseCode	Operation response code (successful=00) 
(Table 1.)	string	
ProcessingIP	IP address	string	
rrn	Unique code of the transaction	string	
TerminalId	Merchant’s terminalid 	string	
TrxnDescription	Description of the transaction	string	
OrderStatus	Payment status code
(Table 2.)	integer	
RefundedAmount	Amount transferred back to the card 	decimal	
CardHolderID
	Unique ID for binding transactions	string	
BindingID	Binding ID	string	
ActionCode	Action code	string	

Response sample

application/json

{
  "PaymentID": "sample string 0",
  "ResponseCode": "sample string 1",
  "Amount": 2.0,
  "ApprovedAmount": 3.0,
  "ApprovalCode": "sample string 4",
  "CardNumber": "sample string 5",
  "ClientName": "sample string 6",
  "Currency": "sample string 7",
  "DateTime": "sample string 8",
  "DepositedAmount": 9.0,
  "Description": "sample string 10",
  "MDOrderID": "sample string 11",
  "MerchantId": "sample string 12",
  "TerminalId": "sample string 13",
  "OrderID": "sample string 14",
  "PaymentState": "sample string 15",
  "PaymentType": 0,
  "PrimaryRC": "sample string 16",
  "ExpDate": "sample string 17",
  "ProcessingIP": "sample string 18",
  "OrderStatus": "sample string 19",
  "CardHolderID": "sample string 20",
  "BindingID": "sample string 21",
  "RefundedAmount": 22.0,
  "Opaque": "sample string 23",
  "TrxnDescription": "sample string 24",
  "rrn": "sample string 25",
  "ActionCode": "sample string 26"
}

application/xml

<MakeBindingPaymentResponse>
  <PaymentID>sample string 0</PaymentID>
  <ResponseCode>sample string 1</ResponseCode>
  <Amount>2</Amount>
  <ApprovedAmount>3</ApprovedAmount>
  <ApprovalCode>sample string 4</ApprovalCode>
  <CardNumber>sample string 5</CardNumber>
  <ClientName>sample string 6</ClientName>
  <Currency>sample string 7</Currency>
  <DateTime>sample string 8</DateTime>
  <DepositedAmount>9</DepositedAmount>
  <Description>sample string 10</Description>
  <MDOrderID>sample string 11</MDOrderID>
  <MerchantId>sample string 12</MerchantId>
  <TerminalId>sample string 13</TerminalId>
  <OrderID>sample string 14</OrderID>
  <PaymentState>sample string 15</PaymentState>
  <PaymentType>None</PaymentType>
  <PrimaryRC>sample string 16</PrimaryRC>
  <ExpDate>sample string 17</ExpDate>
  <ProcessingIP>sample string 18</ProcessingIP>
  <OrderStatus>sample string 19</OrderStatus>
  <CardHolderID>sample string 20</CardHolderID>
  <BindingID>sample string 21</BindingID>
  <RefundedAmount>22</RefundedAmount>
  <Opaque>sample string 23</Opaque>
  <TrxnDescription>sample string 24</TrxnDescription>
  <rrn>sample string 25</rrn>
  <ActionCode>sample string 26</ActionCode>
</MakeBindingPaymentResponse>


9. Function of getting information about bindings: 
https://servicestest.ameriabank.am/VPOS/api/VPOS/GetBindings

Request parameters  GetBindingsRequest
Parameter 	Description	Data Type	Requirement
ClientID	Merchant ID	string	Yes
Password	Merchant password	string	Yes
Username	Merchant user name	string	Yes
PaymentType	Payment type
5- MainRest (arca)
7- PayPal
6- Binding	PaymentsEnum


Request sample

application/json

{
  "ClientID": "sample string 1",
  "Username": "sample string 2",
  "Password": "sample string 3",
  "PaymentType": 0
}






application/xml

<GetBindingsRequest>
  <ClientID>sample string 1</ClientID>
  <Username>sample string 2</Username>
  <Password>sample string 3</Password>
  <PaymentType>None</PaymentType>
</GetBindingsRequest>


Response GetBindingsResponse

Parameter 	Description	Data Type	Requirement
ResponseCode	Response code	string	
ResponseMessage	Response message	string	
CardBindingFileds 	Binded cards list	List<CardBindingFiled>	

CardBindingFiled
Parameter 	Description	Data Type	Requirement
CardPan	Masked card number 	string	
ExpDate	Card’s expiry date 	string	
IsAvtive	Active or inactive binding 	Boolean	
CardHolderID	Unique ID for binding transactions	string	









Response sample

application/json

{
  "ResponseCode": "sample string 1",
  "ResponseMessage": "sample string 2",
  "CardBindingFileds": [
    {
      "CardHolderID": "sample string 1",
      "CardPan": "sample string 2",
      "ExpDate": "sample string 3",
      "IsAvtive": true
    },
    {
      "CardHolderID": "sample string 1",
      "CardPan": "sample string 2",
      "ExpDate": "sample string 3",
      "IsAvtive": true
    }
  ]
}
application/xml
<GetBindingsResponse>
  <ResponseCode>sample string 1</ResponseCode>
  <ResponseMessage>sample string 2</ResponseMessage>
  <CardBindingFileds>
    <CardBindingFiled>
      <CardHolderID>sample string 1</CardHolderID>
      <CardPan>sample string 2</CardPan>
      <ExpDate>sample string 3</ExpDate>
      <IsAvtive>true</IsAvtive>
    </CardBindingFiled>
    <CardBindingFiled>
      <CardHolderID>sample string 1</CardHolderID>
      <CardPan>sample string 2</CardPan>
      <ExpDate>sample string 3</ExpDate>
      <IsAvtive>true</IsAvtive>
    </CardBindingFiled>
  </CardBindingFileds>
</GetBindingsResponse>

10.   Binding deactivation function: 
https://servicestest.ameriabank.am/VPOS/api/VPOS/DeactivateBinding

Request parameters  DeactivateBindingRequest
Parameter 	Description	Data Type	Requirement
ClientID	Merchant ID	string	Yes
Password	Merchant password	string	Yes
Username	Merchant user name	string	Yes
PaymentType	Payment type
5- MainRest (arca)
7- PayPal
6- Binding	PaymentsEnum
Yes
CardHolderID	Unique ID for binding transactions	string	Yes

Request sample

application/json

{
  "ClientID": "sample string 1",
  "Username": "sample string 2",
  "Password": "sample string 3",
  "CardHolderID": "sample string 4",
  "PaymentType": 0
}

application/xml

<DeactivateBindingRequest>
  <ClientID>sample string 1</ClientID>
  <Username>sample string 2</Username>
  <Password>sample string 3</Password>
  <CardHolderID>sample string 4</CardHolderID>
  <PaymentType>None</PaymentType>
</DeactivateBindingRequest>
Response DeactivateBindingResponse
Parameter 	Description	Data Type	Requirement
ResponseCode	Operation response code (successful=00) 
(Table 1.)	string	
ResponseMessage	Description of operation response 	string	
CardHolderID	Unique ID for binding transactions	string	

Response sample
application/json

{
  "ResponseCode": "sample string 1",
  "ResponseMessage": "sample string 2",
  "CardHolderID": "sample string 3"
}
application/xm
<DeactivateBindingResponse>
  <ResponseCode>sample string 1</ResponseCode>
  <ResponseMessage>sample string 2</ResponseMessage>
  <CardHolderID>sample string 3</CardHolderID>
</DeactivateBindingResponse>

11.   Binding activation function 
https://servicestest.ameriabank.am/VPOS/api/VPOS/ActivateBinding
Request parameters  ActivateBindingRequest
Parameter 	Description	Data Type	Requirement
ClientID	Merchant ID	string	Yes
Password	Merchant password	string	Yes
Username	Merchant user name	string	Yes
PaymentType	Payment type
5- MainRest (arca)
7- PayPal
6- Binding	PaymentsEnum
Yes
CardHolderID	Unique ID for binding transactions	string	Yes
Request sample

application/json
{
  "ClientID": "sample string 1",
  "Username": "sample string 2",
  "Password": "sample string 3",
  "CardHolderID": "sample string 4",
  "PaymentType": 0
}
application/xml
<ActivateBindingRequest>
  <ClientID>sample string 1</ClientID>
  <Username>sample string 2</Username>
  <Password>sample string 3</Password>
  <CardHolderID>sample string 4</CardHolderID>
  <PaymentType>None</PaymentType>
</ActivateBindingRequest>

Response ActivateBindingResponse
Parameter 	Description	Data Type	Requirement
ResponseCode	Operation response code (successful=00) 
(Table 1.)	string	
ResponseMessage	Description of operation response 	string	
CardHolderID	Unique ID for binding transactions	string	





Response sample
application/json



{
  "ResponseCode": "sample string 1",
  "ResponseMessage": "sample string 2",
  "CardHolderID": "sample string 3"
}

application/xml
<ActivateBindingResponse>
  <ResponseCode>sample string 1</ResponseCode>
  <ResponseMessage>sample string 2</ResponseMessage>
  <CardHolderID>sample string 3</CardHolderID>
</ActivateBindingResponse>

Table 1. Codes and Description of Operations 
Respcode	RespMessage	Message Description
0-1	sv_unavailable	Processing center response timeout 
0-100	no_payments_yet	No payment attempts 
0-2000	Decline. PAN blacklisted	Transaction declined since the card is in the blacklist
0-2001	Decline. IP blacklisted	Transaction declined since Client’s IP address is in the blacklist 

0-20010	BLOCKED_BY_LIMIT	Transaction declined since payment amount exceeded the limits set by the issuer bank

0-2002	Decline. Payment over limit	Transaction declined since payment amount exceeded the limits
(daily turnover limits of the merchant set by the acquiring bank or one card turnover limit of the merchant or one transaction limit of the merchant)
0-2004	SSL without CVC forbidden	Payment through SSL without entering SVС data is forbidden 
0-2005	Decline. 3DSec sign error	We failed to check the issuer’s signature, i.e. PARes was readable but was not signed correctly 

0-2006	Decline. 3DSec decline	Issuer declined authentication 

0-2007	Decline. Payment time limit	Card data registration timeout starting from the moment of payment registration (timeout will be in 20 minutes)

0-2011	Declined. PaRes status is unknown	Card is included in 3d secure but the issuer bank is not ready (at that moment) to execute 3ds of transaction
0-2012	Operation not supported	This operation is not supported 
0-2013	Исчерпаны

попытки оплаты	Payment attempts expired 
0-2015	Decline by iReq in VERes	VERes of DS contain iReq, due to which payment was declined 
0-2016	Declined. VeRes status is unknown	Issuer bank is not ready (at that moment) to execute 3ds of transaction (for instance, the bank’s ACS does not function). We cannot define whether the card is included in 3d secure or not.

0-2018	Declined. DS connection timeout	Directory server Visa or MasterCard cannot be reached or “connection failed” error is received in response to request VeReq.
This error is the result interaction of payment gateway and MPS servers due to their technical failures.
0-2019	Decline by iReq in PARes	Issuer’s PARes contains iReq, due to which payment was declined.
0-9000	Started	Transactions start 
00	Approved.	Payment successfully completed 
01	Order already exists	Order with the given number is already registered in the system 
0100	Decline. Card declined	Issuer bank has forbidden online card transactions
01001	Decline. Data input timeout	At the moment of registering the transaction, i.e. when the card details are not entered yet

0101	Decline. Expired card	Card’s validity period has expired 
0103	Decline. Call issuer	No connection with the issuer bank, the merchant must call the issuer bank

0104	Decline. Card declined	Attempt to make a transaction via blocked account 
0107	Decline. Call issuer	It is necessary to call the issuer bank 
0109	Decline. Invalid merchant	Merchant’s/*terminal ID is invalid (for completion and preauthorization with different IDs)
0110	Decline. Invalid amount	Transaction amount is invalid
0111	Decline. No card record on Decline. Wrong PAN	Card number is invalid
0116	Decline. Decline. Not enough money	Transaction amount exceeds the available account balance 
0120	Decline. Not allowed	Transaction declined since it is not allowed by the issuer 
Payment network code: 57
Reason for declining the transaction should be clarified from the issuer.
0121	Decline. Excds wdrwl limt	Attempt to make a transaction exceeding the daily limit set by the issuer bank 

0123	Decline. Excds wdrwl ltmt	Limit on the number of transactions is exceeded. Client has made maximum number of transactions within the limit and attempts to make one more transaction

0125	Decline. Card declined	Invalid Card number 
Attempt to refund an amount exceeding the hold, attempt to refund zero amount

0151017	Decline. 3DSec comm error	3-D Secure connection error 
0151018	Decline. Processing timeout	Processing timeout, failed to send 
0151019	Decline. Processing timeout	Processing timeout, sent but no response received from the bank 

02001	Decline. Fraud	Fraudulent transaction ( according to processing or payment network)
02003	Decline. SSL restricted	Merchant is not allowed to perform SSL (Not 3d-Secure/SecureCode) transactions 
02005	3DS rule failed	Payment does not comply with the  3ds verification terms 
0208	Decline. Card is lost	Card is lost 
0209	Decline. Card limitations exceeded	Card limitations are exceeded 
0341014	Decline. General Error	RBS decline error 

0341041	Decline. Refund failed	Refund error 
05	Incorrect Parameters	Error in request parameters 

071015	Decline. Input error	Incorrect card parameters input

08204	Decline. Duplicate order	Such order has already been registered (check by order number)
09001	RBS internal error	Internal code of RBS rejection 
0902	Decline. Invalid trans	Cardholder attempts to make a forbidden transaction 
0903	Decline. Re-enter trans.	Attempt to make a transaction in the amount exceeding the limit set by the issuer bank 

0904	Decline. Format error	Error message format according to issuer bank 
0907	Decline. Host not avail.	No connection with the issuer bank.
Stand-in authorization is not allowed for the given card number (this mode means that the issuer cannot connect to the payment network, so the transaction is either in offline mode and is then going to be sent to the back office or will be declined) 

0909	Decline. Call issuer	General system failure fixed by the payment network or the issuer bank 

0910	Decline. Host not avail.	Issuer bank is not available 
0913	Decline. Invalid trans	Invalid transaction format according to the network 

0914	Decline. Orig trans not found	Transaction is not found (while sending completion, reversal or refund request)
0999	Declined by fraud	Transaction authorization did not start. Declined due to fraud or 3dsec error.

02		Order declined due to errors in payment details 
03	Incorrect Currency	Unknown (forbidden) currency 
04	Required parameter missed	Required parameter of the request is missing 
06	Unregistered OrderId	Unregistered OrderId
07	System Error	System error
20	Incorrect Username and Password	Incorrect Username and Password
30	Incorrect Value of Opque field of the initial request	Incorrect Value of Opque field of the initial request
550	System Error	System Error
514	Do not have Reverse operation permission	
513
	Do not have Refund operation permission	
560
	Operation failed	
520
	Overtime error	
50
	Payment sum error	
510	Incorrect parameters	
500	Unknown error	

Table 2. Payment State Values 

Payment State	Order Status Code	Description
payment_started	0	Order is registered but not paid
payment_approved	1	Amount of the order was preauthorized 
payment_declined	6	Authorization declined 
payment_deposited	2	Amount successfully authorized 
payment_refunded	4	Amount of the transaction was refunded 
payment_autoauthorized	5	Authorization via ACS of the issuer bank 
payment_void	3	Authorization cancelled  


