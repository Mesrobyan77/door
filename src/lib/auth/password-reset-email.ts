import type { Locale } from '@/lib/i18n/config';

export function buildPasswordResetEmail(resetUrl: string, locale: Locale) {
  const copy = {
    hy: {
      subject: 'Վերականգնեք White Shop-ի գաղտնաբառը',
      intro: 'Ստացել ենք ձեր գաղտնաբառը վերականգնելու հարցում։',
      action: 'Ընտրել նոր գաղտնաբառ',
      expires: 'Հղումը վավեր է 1 ժամ։',
      ignore: 'Եթե հարցումը դուք չեք կատարել, անտեսեք այս նամակը։',
    },
    en: {
      subject: 'Reset your White Shop password',
      intro: 'We received a request to reset your password.',
      action: 'Choose a new password',
      expires: 'This link expires in 1 hour.',
      ignore: 'If you did not request this, you can ignore this email.',
    },
    ru: {
      subject: 'Восстановите пароль White Shop',
      intro: 'Мы получили запрос на восстановление вашего пароля.',
      action: 'Выбрать новый пароль',
      expires: 'Ссылка действует 1 час.',
      ignore: 'Если вы не отправляли запрос, проигнорируйте это письмо.',
    },
  }[locale];
  return {
    subject: copy.subject,
    text: `${copy.intro}\n\n${copy.action}: ${resetUrl}\n\n${copy.expires}\n${copy.ignore}`,
    html: `<p>${copy.intro}</p><p><a href="${resetUrl}">${copy.action}</a></p><p>${copy.expires}</p><p>${copy.ignore}</p>`,
  };
}
