import { describe, expect, it, vi } from 'vitest';

import { registerArcaOrder } from '@/lib/payments/arca-client';

describe('ArCa hosted registration', () => {
  it('sends the documented form protocol with AMD minor units and 3DS2', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ errorCode: 0, orderId: 'gateway-1', formUrl: 'https://gateway/form' }),
          { status: 200 },
        ),
      );
    await expect(
      registerArcaOrder(
        {
          baseUrl: 'https://ipaytest.arca.am:8445/payment/rest',
          userName: 'merchant',
          password: 'secret',
        },
        {
          orderNumber: 'p1',
          amount: 1900,
          returnUrl: 'https://shop.test/callback',
          description: 'Order',
          language: 'hy',
        },
        request,
      ),
    ).resolves.toEqual({ orderId: 'gateway-1', formUrl: 'https://gateway/form' });
    const [url, init] = request.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://ipaytest.arca.am:8445/payment/rest/register.do');
    const body = init.body as URLSearchParams;
    expect(body.get('amount')).toBe('190000');
    expect(body.get('currency')).toBe('051');
    expect(body.get('jsonParams')).toBe('{"FORCE_3DS2":"true"}');
  });
});
