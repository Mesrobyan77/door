import { describe, expect, it } from 'vitest';
import { buildPasswordResetEmail } from '@/lib/auth/password-reset-email';

describe('password reset email', () => {
  it.each(['hy', 'en', 'ru'] as const)(
    'builds localized %s content with the trusted link',
    (locale) => {
      const email = buildPasswordResetEmail('https://shop.example/reset?token=opaque', locale);
      expect(email.subject.length).toBeGreaterThan(5);
      expect(email.text).toContain('https://shop.example/reset?token=opaque');
      expect(email.html).toContain('https://shop.example/reset?token=opaque');
    },
  );
});
