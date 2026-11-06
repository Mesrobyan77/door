import "server-only";

import { getStoreFxRates } from "@/features/settings/application/queries";
import { createStubEmailAdapter } from "@/lib/email/stub-adapter";
import type { EmailAdapter } from "@/lib/email/types";
import { createStaticExchangeRateAdapter } from "@/lib/fx/static-adapter";
import type { ExchangeRateAdapter } from "@/lib/fx/types";
import { createCodPaymentAdapter } from "@/lib/payments/cod-adapter";
import type { PaymentAdapter } from "@/lib/payments/types";
import { createMemoryRedisAdapter } from "@/lib/redis/memory-adapter";
import type { RedisAdapter } from "@/lib/redis/types";

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

  cachedProviders = {
    redis: createMemoryRedisAdapter(),
    email: createStubEmailAdapter(),
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
