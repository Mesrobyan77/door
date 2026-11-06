import 'server-only';

import { getEnv } from '@/config/env';

export type OnlineProvider = 'arca' | 'idram';

export type ProviderConfiguration = {
  enabled: boolean;
  environment: 'test' | 'live';
  appUrl: string | null;
  missing: string[];
};

function active(testMode: 'true' | 'false' | undefined): boolean {
  return testMode === 'true';
}

/** Configuration is intentionally explicit: NODE_ENV never selects live money. */
export function getPaymentConfiguration(provider: OnlineProvider): ProviderConfiguration {
  const env = getEnv();
  const appUrl = env.PAYMENT_APP_URL ?? env.NEXT_PUBLIC_APP_URL;
  let values: Array<string | undefined>;
  let testMode: 'true' | 'false' | undefined;

  switch (provider) {
    case 'arca':
      testMode = env.ARCA_TEST_MODE;
      values = active(testMode)
        ? [env.ARCA_BASE_URL, env.ARCA_USERNAME, env.ARCA_PASSWORD]
        : [env.ARCA_LIVE_BASE_URL, env.ARCA_LIVE_USERNAME, env.ARCA_LIVE_PASSWORD];
      break;
    case 'idram':
      testMode = env.IDRAM_TEST_MODE;
      values = active(testMode)
        ? [env.IDRAM_REC_ACCOUNT, env.IDRAM_SECRET_KEY]
        : [env.IDRAM_LIVE_REC_ACCOUNT, env.IDRAM_LIVE_SECRET_KEY];
      break;
  }

  const missing = [
    ...(appUrl ? [] : ['PAYMENT_APP_URL']),
    ...values
      .map((value, index) => (value ? null : `provider credential #${index + 1}`))
      .filter((value): value is string => value !== null),
  ];
  return {
    enabled: missing.length === 0,
    environment: active(testMode) ? 'test' : 'live',
    appUrl,
    missing,
  };
}

export function availableOnlineProviders(): OnlineProvider[] {
  const providers: OnlineProvider[] = ['arca', 'idram'];
  return providers.filter((provider) => getPaymentConfiguration(provider).enabled);
}

/** Server-only credentials selected explicitly by the provider test-mode flag. */
export function getArcaCredentials(): {
  baseUrl: string;
  userName: string;
  password: string;
} | null {
  const env = getEnv();
  const test = active(env.ARCA_TEST_MODE);
  const baseUrl = test ? env.ARCA_BASE_URL : env.ARCA_LIVE_BASE_URL;
  const userName = test ? env.ARCA_USERNAME : env.ARCA_LIVE_USERNAME;
  const password = test ? env.ARCA_PASSWORD : env.ARCA_LIVE_PASSWORD;
  return baseUrl && userName && password ? { baseUrl, userName, password } : null;
}

export function getIdramCredentials(): { recAccount: string } | null {
  const env = getEnv();
  const recAccount = active(env.IDRAM_TEST_MODE)
    ? env.IDRAM_REC_ACCOUNT
    : env.IDRAM_LIVE_REC_ACCOUNT;
  return recAccount ? { recAccount } : null;
}
