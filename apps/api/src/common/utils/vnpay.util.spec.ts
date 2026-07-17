import {
  buildVnpaySecureHash,
  encodeVnpayValue,
  formatVnpayCreateDate,
  verifyVnpaySignature,
} from './vnpay.util';

const HASH_SECRET = 'test-secret-key';

function signedQuery(params: Record<string, string>): Record<string, string> {
  const vnp_SecureHash = buildVnpaySecureHash(params, HASH_SECRET);
  return { ...params, vnp_SecureHash, vnp_SecureHashType: 'HmacSHA512' };
}

describe('buildVnpaySecureHash / verifyVnpaySignature', () => {
  const baseParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: 'DEMO001',
    vnp_Amount: '10000000',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: 'ORD-001',
    vnp_OrderInfo: 'Thanh toan don hang ORD-001',
    vnp_Locale: 'vn',
  };

  it('round-trips: a query signed with a secret verifies successfully with the same secret', () => {
    const query = signedQuery(baseParams);
    expect(verifyVnpaySignature(query, HASH_SECRET)).toBe(true);
  });

  it('is order-independent — key order in the input object does not affect the hash', () => {
    const reordered = {
      vnp_TxnRef: baseParams.vnp_TxnRef,
      vnp_Amount: baseParams.vnp_Amount,
      vnp_Version: baseParams.vnp_Version,
      vnp_Command: baseParams.vnp_Command,
      vnp_TmnCode: baseParams.vnp_TmnCode,
      vnp_CurrCode: baseParams.vnp_CurrCode,
      vnp_OrderInfo: baseParams.vnp_OrderInfo,
      vnp_Locale: baseParams.vnp_Locale,
    };
    expect(buildVnpaySecureHash(reordered, HASH_SECRET)).toBe(
      buildVnpaySecureHash(baseParams, HASH_SECRET),
    );
  });

  it('fails verification when a single field is tampered with after signing', () => {
    const query = signedQuery(baseParams);
    const tampered = { ...query, vnp_Amount: '99999999' };
    expect(verifyVnpaySignature(tampered, HASH_SECRET)).toBe(false);
  });

  it('fails verification when the hash secret does not match', () => {
    const query = signedQuery(baseParams);
    expect(verifyVnpaySignature(query, 'wrong-secret')).toBe(false);
  });

  it('fails verification when vnp_SecureHash is missing', () => {
    const { vnp_SecureHash: _drop, ...query } = signedQuery(baseParams);
    expect(verifyVnpaySignature(query, HASH_SECRET)).toBe(false);
  });

  it('handles Vietnamese diacritics/spaces in vnp_OrderInfo consistently', () => {
    const params = { ...baseParams, vnp_OrderInfo: 'Thanh toán đơn hàng #123 – Xe cứu hỏa' };
    const query = signedQuery(params);
    expect(verifyVnpaySignature(query, HASH_SECRET)).toBe(true);
  });
});

describe('encodeVnpayValue', () => {
  it('encodes a space as + rather than %20, matching VNPay\'s own reference implementation', () => {
    expect(encodeVnpayValue('Thanh toan don hang ORD-001')).toBe('Thanh+toan+don+hang+ORD-001');
  });

  it('still percent-encodes other reserved characters normally', () => {
    expect(encodeVnpayValue('a&b=c')).toBe('a%26b%3Dc');
  });
});

describe('formatVnpayCreateDate', () => {
  it('formats as yyyyMMddHHmmss in Asia/Ho_Chi_Minh (GMT+7), independent of server timezone', () => {
    // 2026-01-01T00:30:00.000Z UTC -> 2026-01-01T07:30:00 in GMT+7
    const utcDate = new Date('2026-01-01T00:30:00.000Z');
    expect(formatVnpayCreateDate(utcDate)).toBe('20260101073000');
  });

  it('rolls over to the next day when the GMT+7 offset crosses midnight', () => {
    // 2026-01-01T20:00:00.000Z UTC -> 2026-01-02T03:00:00 in GMT+7
    const utcDate = new Date('2026-01-01T20:00:00.000Z');
    expect(formatVnpayCreateDate(utcDate)).toBe('20260102030000');
  });
});
