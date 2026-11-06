import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createResendEmailAdapter } from '@/lib/email/resend-adapter';

const message = {
  to: 'user@example.test',
  subject: 'Verify',
  text: 'Verification message',
  html: '<p>Verification message</p>',
};

describe('Resend email adapter', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the provider message id on accepted delivery', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'mail-1' }), { status: 200 })),
    );
    await expect(
      createResendEmailAdapter({ apiKey: 'test-key', from: 'sender@example.test' }).send(message),
    ).resolves.toEqual({ id: 'mail-1' });
  });

  it('throws when Resend rejects or does not acknowledge delivery', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    const adapter = createResendEmailAdapter({ apiKey: 'test-key', from: 'sender@example.test' });
    await expect(adapter.send(message)).rejects.toThrow('EMAIL_DELIVERY_FAILED');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    await expect(adapter.send(message)).rejects.toThrow('EMAIL_DELIVERY_FAILED');
  });
});
