import 'server-only';

import { getStoreFxRates } from '@/features/settings/application/queries';
import { createStubEmailAdapter } from '@/lib/email/stub-adapter';
import { createResendEmailAdapter } from '@/lib/email/resend-adapter';
import type { EmailAdapter } from '@/lib/email/types';
import { createStaticExchangeRateAdapter } from '@/lib/fx/static-adapter';
import type { ExchangeRateAdapter } from '@/lib/fx/types';
import { createCodPaymentAdapter } from '@/lib/payments/cod-adapter';
import type { PaymentAdapter } from '@/lib/payments/types';
import { createMemoryRedisAdapter } from '@/lib/redis/memory-adapter';
import { createUpstashRedisAdapter } from '@/lib/redis/upstash-adapter';
import { getEnv } from '@/config/env';
import type { RedisAdapter } from '@/lib/redis/types';

export type AppProviders = {
  redis: RedisAdapter;
  email: EmailAdapter;
  payment: PaymentAdapter;
  exchangeRates: ExchangeRateAdapter;
};

let cachedProviders: AppProviders | undefined;

/**
 * Provider composition root. Real Upstash/Resend adapters replace stubs
 * when credentials are present and feature wiring needs them.
 */
export function getProviders(): AppProviders {
  if (cachedProviders) {
    return cachedProviders;
  }

  const env = getEnv();
  cachedProviders = {
    redis:
      env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
        ? createUpstashRedisAdapter({
            url: env.UPSTASH_REDIS_REST_URL,
            token: env.UPSTASH_REDIS_REST_TOKEN,
          })
        : createMemoryRedisAdapter(),
    email:
      env.RESEND_API_KEY && env.EMAIL_FROM
        ? createResendEmailAdapter({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM })
        : createStubEmailAdapter(),
    payment: createCodPaymentAdapter(),
    exchangeRates: createStaticExchangeRateAdapter({
      getRatesFromAmd: async () => {
        const rates = await getStoreFxRates();
        return { USD: rates.usd, RUB: rates.rub };
      },
    }),
  };

  return cachedProviders;
}
