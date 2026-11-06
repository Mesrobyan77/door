import "server-only";

import { getEnv } from "@/config/env";
import { getStoreFxRates } from "@/features/settings/application/queries";
import { createStubEmailAdapter } from "@/lib/email/stub-adapter";
import type { EmailAdapter } from "@/lib/email/types";
import { createStaticExchangeRateAdapter } from "@/lib/fx/static-adapter";
import type { ExchangeRateAdapter } from "@/lib/fx/types";
import { createCodPaymentAdapter } from "@/lib/payments/cod-adapter";
import type { PaymentAdapter } from "@/lib/payments/types";
import {
  createR2ObjectStorageAdapter,
} from "@/lib/r2/r2-adapter";
import { isR2Configured } from "@/lib/r2/is-configured";
import { createStubObjectStorageAdapter } from "@/lib/r2/stub-adapter";
import type { ObjectStorageAdapter } from "@/lib/r2/types";
import { createMemoryRedisAdapter } from "@/lib/redis/memory-adapter";
import type { RedisAdapter } from "@/lib/redis/types";

export type AppProviders = {
  redis: RedisAdapter;
  storage: ObjectStorageAdapter;
  email: EmailAdapter;
  payment: PaymentAdapter;
  exchangeRates: ExchangeRateAdapter;
};

let cachedProviders: AppProviders | undefined;

function createStorageAdapter(): ObjectStorageAdapter {
  const env = getEnv();
  const r2 = {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL,
  };

  if (isR2Configured(r2)) {
    return createR2ObjectStorageAdapter({
      ...r2,
      endpoint: env.R2_ENDPOINT,
    });
  }

  // Empty base → relative `/uploads/...` URLs for local stub files in `public/`.
  return createStubObjectStorageAdapter(env.R2_PUBLIC_BASE_URL ?? "");
}

/**
 * Provider composition root. Real Upstash/R2/Resend adapters replace stubs
 * when credentials are present and feature wiring needs them.
 */
export function getProviders(): AppProviders {
  if (cachedProviders) {
    return cachedProviders;
  }

  cachedProviders = {
    redis: createMemoryRedisAdapter(),
    storage: createStorageAdapter(),
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
