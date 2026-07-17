import * as crypto from 'crypto';

export interface MomoRequestSignatureFields {
  accessKey: string;
  amount: string;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
}

export interface MomoCallbackSignatureFields {
  accessKey: string;
  amount: string;
  extraData: string;
  message: string;
  orderId: string;
  orderInfo: string;
  orderType: string;
  partnerCode: string;
  payType: string;
  requestId: string;
  responseTime: string;
  resultCode: string;
  transId: string;
}

/**
 * MoMo signs a specific named field subset in a fixed order — unlike VNPay's generic "sort
 * whatever keys are present" signer, this is NOT interchangeable across request shapes: the
 * create-payment request and the IPN/redirect callback each have their own fixed field list, and
 * every field must be present in exactly this order or the HMAC will never match MoMo's own.
 */
export function buildMomoRequestSignature(
  fields: MomoRequestSignatureFields,
  secretKey: string,
): string {
  const raw =
    `accessKey=${fields.accessKey}&amount=${fields.amount}&extraData=${fields.extraData}` +
    `&ipnUrl=${fields.ipnUrl}&orderId=${fields.orderId}&orderInfo=${fields.orderInfo}` +
    `&partnerCode=${fields.partnerCode}&redirectUrl=${fields.redirectUrl}` +
    `&requestId=${fields.requestId}&requestType=${fields.requestType}`;
  return crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
}

/** Shared by both the IPN (POST JSON body) and redirect (GET query params) handlers — MoMo's own
 * docs confirm both carry the same field set, just delivered differently. All numeric-typed
 * MoMo fields (`amount`, `resultCode`, `responseTime`) must already be plain decimal strings by
 * the time they reach this function — normalize them once, explicitly, at the controller
 * boundary where the source type (JSON number vs query string) is known. */
export function buildMomoCallbackSignature(
  fields: MomoCallbackSignatureFields,
  secretKey: string,
): string {
  const raw =
    `accessKey=${fields.accessKey}&amount=${fields.amount}&extraData=${fields.extraData}` +
    `&message=${fields.message}&orderId=${fields.orderId}&orderInfo=${fields.orderInfo}` +
    `&orderType=${fields.orderType}&partnerCode=${fields.partnerCode}&payType=${fields.payType}` +
    `&requestId=${fields.requestId}&responseTime=${fields.responseTime}` +
    `&resultCode=${fields.resultCode}&transId=${fields.transId}`;
  return crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
}

export function verifyMomoSignature(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
