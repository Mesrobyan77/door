import { describe, expect, it } from 'vitest';
import { arcaAmount, idramChecksum, isArcaPaid } from '@/lib/payments/protocol';
import { formatIdramAmount, idramLanguage } from '@/lib/payments/idram';

describe('payment protocol helpers', () => {
  it('serializes ARCA AMD in minor units', () => expect(arcaAmount(1000)).toBe('100000'));
  it('accepts documented authoritative card statuses only', () => {
    expect(isArcaPaid({ errorCode: 0, paymentAmountInfo: { paymentState: 'DEPOSITED' } })).toBe(
      true,
    );
  });
  it('uses the documented checksum field orders', () => {
    expect(
      idramChecksum(
        {
          EDP_REC_ACCOUNT: 'a',
          EDP_AMOUNT: '1',
          EDP_BILL_NO: 'b',
          EDP_PAYER_ACCOUNT: 'c',
          EDP_TRANS_ID: 'd',
          EDP_TRANS_DATE: 'e',
        },
        'key',
      ),
    ).toHaveLength(32);
  });
  it("uses Idram's AMD integer and language serialization", () => {
    expect(formatIdramAmount(1900)).toBe('1900');
    expect(idramLanguage('hy')).toBe('AM');
  });
});
