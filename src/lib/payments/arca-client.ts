import { arcaAmount } from '@/lib/payments/protocol';

export type ArcaCredentials = { baseUrl: string; userName: string; password: string };

export type ArcaRegistration = { orderId: string; formUrl: string };

type ArcaResponse = {
  errorCode?: number | string;
  errorMessage?: string;
  orderId?: string;
  formUrl?: string;
};

/** Hosted ArCa/IPay REST registration. Card data never passes through this app. */
export async function registerArcaOrder(
  credentials: ArcaCredentials,
  input: {
    orderNumber: string;
    amount: number;
    returnUrl: string;
    description: string;
    language: 'hy' | 'en' | 'ru';
  },
  request: typeof fetch = fetch,
): Promise<ArcaRegistration> {
  const body = new URLSearchParams({
    userName: credentials.userName,
    password: credentials.password,
    orderNumber: input.orderNumber,
    amount: arcaAmount(input.amount),
    currency: '051',
    returnUrl: input.returnUrl,
    description: input.description,
    language: input.language,
    jsonParams: JSON.stringify({ FORCE_3DS2: 'true' }),
  });
  const response = await request(`${credentials.baseUrl.replace(/\/$/, '')}/register.do`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('ARCA_REGISTER_UNAVAILABLE');
  const data = (await response.json()) as ArcaResponse;
  if (Number(data.errorCode) !== 0 || !data.orderId || !data.formUrl) {
    throw new Error('ARCA_REGISTER_REJECTED');
  }
  return { orderId: data.orderId, formUrl: data.formUrl };
}

export async function getArcaOrderStatus(
  credentials: ArcaCredentials,
  providerOrderId: string,
  request: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({
    userName: credentials.userName,
    password: credentials.password,
    orderId: providerOrderId,
  });
  const response = await request(
    `${credentials.baseUrl.replace(/\/$/, '')}/getOrderStatusExtended.do`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    },
  );
  if (!response.ok) throw new Error('ARCA_STATUS_UNAVAILABLE');
  return (await response.json()) as Record<string, unknown>;
}
