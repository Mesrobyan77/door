export const IDRAM_PAYMENT_URL = 'https://banking.idram.am/Payment/GetPayment';

export function idramLanguage(locale: 'hy' | 'en' | 'ru'): 'AM' | 'EN' | 'RU' {
  return locale === 'hy' ? 'AM' : (locale.toUpperCase() as 'EN' | 'RU');
}

export function formatIdramAmount(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('INVALID_AMOUNT');
  return String(amount);
}
