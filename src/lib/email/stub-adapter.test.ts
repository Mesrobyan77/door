import { describe, expect, it } from 'vitest';

import { createStubEmailAdapter } from '@/lib/email/stub-adapter';

describe('stub email adapter', () => {
  it('reports that delivery is unavailable instead of claiming success', async () => {
    await expect(
      createStubEmailAdapter().send({
        to: 'user@example.test',
        subject: 'Verify',
        text: 'Verification message',
        html: '<p>Verification message</p>',
      }),
    ).rejects.toThrow('EMAIL_PROVIDER_NOT_CONFIGURED');
  });
});
