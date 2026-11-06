import 'server-only';
import type { EmailAdapter, EmailMessage } from '@/lib/email/types';

export function createResendEmailAdapter(input: { apiKey: string; from: string }): EmailAdapter {
  return {
    name: 'resend',
    async send(message: EmailMessage) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${input.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: input.from, ...message }),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('EMAIL_DELIVERY_FAILED');
      const body = (await response.json()) as { id?: string };
      if (!body.id) throw new Error('EMAIL_DELIVERY_FAILED');
      return { id: body.id };
    },
  };
}
