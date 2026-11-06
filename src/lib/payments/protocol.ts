import { createHash } from 'node:crypto';

export function md5(value: string): string {
  return createHash('md5').update(value, 'utf8').digest('hex');
}

export function arcaAmount(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('INVALID_AMOUNT');
  return String(amount * 100);
}

export function isArcaPaid(details: Record<string, unknown>): boolean {
  const state = String(
    (details.paymentAmountInfo as Record<string, unknown> | undefined)?.paymentState ??
      details.paymentState ??
      '',
  ).toUpperCase();
  return (
    Number(details.errorCode) === 0 && (state === 'DEPOSITED' || Number(details.orderStatus) === 2)
  );
}

export function idramChecksum(fields: Record<string, string>, secret: string): string {
  return md5(
    [
      fields.EDP_REC_ACCOUNT,
      fields.EDP_AMOUNT,
      secret,
      fields.EDP_BILL_NO,
      fields.EDP_PAYER_ACCOUNT,
      fields.EDP_TRANS_ID,
      fields.EDP_TRANS_DATE,
    ].join(':'),
  );
}
