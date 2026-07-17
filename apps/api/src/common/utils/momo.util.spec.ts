import {
  buildMomoCallbackSignature,
  buildMomoRequestSignature,
  verifyMomoSignature,
} from './momo.util';

const SECRET_KEY = 'test-momo-secret';

describe('buildMomoRequestSignature / verifyMomoSignature', () => {
  const requestFields = {
    accessKey: 'F8BBA842ECF85',
    amount: '230000',
    extraData: '',
    ipnUrl: 'http://localhost:4000/api/payments/momo/ipn',
    orderId: 'DTT12345678',
    orderInfo: 'Thanh toan don hang DTT12345678',
    partnerCode: 'MOMO',
    redirectUrl: 'http://localhost:4000/api/payments/momo/return',
    requestId: 'DTT12345678',
    requestType: 'captureWallet',
  };

  it('produces the same signature for the same fields (deterministic)', () => {
    const a = buildMomoRequestSignature(requestFields, SECRET_KEY);
    const b = buildMomoRequestSignature(requestFields, SECRET_KEY);
    expect(a).toBe(b);
  });

  it('round-trips: a signature built with a secret verifies against itself', () => {
    const signature = buildMomoRequestSignature(requestFields, SECRET_KEY);
    expect(verifyMomoSignature(signature, signature)).toBe(true);
  });

  it('fails verification when a single field changes', () => {
    const signature = buildMomoRequestSignature(requestFields, SECRET_KEY);
    const tampered = buildMomoRequestSignature({ ...requestFields, amount: '999999' }, SECRET_KEY);
    expect(verifyMomoSignature(signature, tampered)).toBe(false);
  });

  it('fails verification when the secret key differs', () => {
    const signature = buildMomoRequestSignature(requestFields, SECRET_KEY);
    const otherSecret = buildMomoRequestSignature(requestFields, 'a-different-secret');
    expect(verifyMomoSignature(signature, otherSecret)).toBe(false);
  });

  it('does not URL-encode field values — MoMo signs plain JSON string values, unlike VNPay', () => {
    const withDiacritics = {
      ...requestFields,
      orderInfo: 'Thanh toán đơn hàng #123 – Xe cứu hỏa',
    };
    // Round-trips fine with the raw diacritics still embedded — no +/%20 substitution applied.
    const signature = buildMomoRequestSignature(withDiacritics, SECRET_KEY);
    const recomputed = buildMomoRequestSignature(withDiacritics, SECRET_KEY);
    expect(signature).toBe(recomputed);
  });
});

describe('buildMomoCallbackSignature (shared by IPN and redirect verification)', () => {
  const callbackFields = {
    accessKey: 'F8BBA842ECF85',
    amount: '230000',
    extraData: '',
    message: 'Successful.',
    orderId: 'DTT12345678',
    orderInfo: 'Thanh toan don hang DTT12345678',
    orderType: 'momo_wallet',
    partnerCode: 'MOMO',
    payType: 'webApp',
    requestId: 'DTT12345678',
    responseTime: '1735689600000',
    resultCode: '0',
    transId: '2000123456789',
  };

  it('round-trips and fails when tampered', () => {
    const signature = buildMomoCallbackSignature(callbackFields, SECRET_KEY);
    expect(verifyMomoSignature(signature, signature)).toBe(true);

    const tampered = buildMomoCallbackSignature(
      { ...callbackFields, resultCode: '1' },
      SECRET_KEY,
    );
    expect(verifyMomoSignature(signature, tampered)).toBe(false);
  });

  it('uses a different field set/order than the request signature (not interchangeable)', () => {
    const requestFields = {
      accessKey: 'F8BBA842ECF85',
      amount: '230000',
      extraData: '',
      ipnUrl: 'http://localhost:4000/api/payments/momo/ipn',
      orderId: 'DTT12345678',
      orderInfo: 'Thanh toan don hang DTT12345678',
      partnerCode: 'MOMO',
      redirectUrl: 'http://localhost:4000/api/payments/momo/return',
      requestId: 'DTT12345678',
      requestType: 'captureWallet',
    };
    const requestSig = buildMomoRequestSignature(requestFields, SECRET_KEY);
    const callbackSig = buildMomoCallbackSignature(callbackFields, SECRET_KEY);
    expect(requestSig).not.toBe(callbackSig);
  });
});
