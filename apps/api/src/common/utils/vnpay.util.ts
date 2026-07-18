import * as crypto from 'crypto';

const VNP_TIMEZONE_OFFSET_MINUTES = 7 * 60;

/** VNPay's own reference implementation percent-encodes via `encodeURIComponent`, then
 * additionally rewrites `%20` (space) to `+` — the classic application/x-www-form-urlencoded
 * convention layered on top of stricter percent-encoding. Both sides of every signature (ours
 * when building a payment URL, VNPay's when they compute the hash) must use this exact rule, or
 * any value containing a space (e.g. `vnp_OrderInfo`) silently breaks the HMAC. */
export function encodeVnpayValue(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

/** Sorts keys, VNPay-encodes each value, and joins as `key=value&...` — the exact string VNPay
 * signs. Must be used identically when building an outbound request and when reconstructing
 * the string-to-sign from an inbound callback, or the HMAC will never match.
 *
 * Two rules that mirror VNPay's own reference signer exactly, both required or the HMAC silently
 * diverges from theirs:
 *   1. Empty/blank params are EXCLUDED from the signature. VNPay's callbacks (return URL + IPN)
 *      routinely echo blank fields (e.g. `vnp_BankTranNo`/`vnp_CardType` are empty for some
 *      response codes), and their reference code signs only non-empty values
 *      (`if (fieldValue != null && fieldValue.length() > 0)`). Including `vnp_CardType=` in our
 *      recomputed string while VNPay omitted it makes every such callback fail verification with
 *      a bogus "sai chữ ký".
 *   2. Keys are sorted by raw code-unit order (like PHP `ksort`/JS default sort), NOT
 *      `localeCompare` — locale-aware collation can reorder keys under some ICU locales and would
 *      no longer match VNPay's byte-order sort. */
function buildSignableQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${encodeVnpayValue(value)}`)
    .join('&');
}

export function buildVnpaySecureHash(params: Record<string, string>, hashSecret: string): string {
  const signable = buildSignableQueryString(params);
  return crypto.createHmac('sha512', hashSecret).update(signable).digest('hex');
}

/** Verifies an inbound VNPay callback (return URL or IPN) — both carry the same `vnp_*` query
 * shape. `vnp_SecureHash`/`vnp_SecureHashType` are excluded from the signed payload itself. */
export function verifyVnpaySignature(query: Record<string, string>, hashSecret: string): boolean {
  const { vnp_SecureHash: receivedHash, vnp_SecureHashType: _ignored, ...rest } = query;
  if (!receivedHash) return false;

  const expectedHash = buildVnpaySecureHash(rest, hashSecret);

  const receivedBuffer = Buffer.from(receivedHash, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  if (receivedBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

/** VNPay validates `vnp_CreateDate`/`vnp_ExpireDate` against Vietnam's clock (GMT+7) regardless
 * of the server's own timezone, so this always converts to Asia/Ho_Chi_Minh time explicitly
 * rather than relying on server-local time. */
export function formatVnpayCreateDate(date: Date): string {
  const vnTime = new Date(date.getTime() + VNP_TIMEZONE_OFFSET_MINUTES * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${vnTime.getUTCFullYear()}${pad(vnTime.getUTCMonth() + 1)}${pad(vnTime.getUTCDate())}` +
    `${pad(vnTime.getUTCHours())}${pad(vnTime.getUTCMinutes())}${pad(vnTime.getUTCSeconds())}`
  );
}
