import type { EmailAdapter } from '@/lib/email/types';

export function createStubEmailAdapter(): EmailAdapter {
  return {
    name: 'stub-email',
    async send() {
      // Never claim delivery or log a raw verification URL when no provider exists.
      throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
    },
  };
}
