import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildVnpaySecureHash,
  encodeVnpayValue,
  formatVnpayCreateDate,
  verifyVnpaySignature,
} from '../../common/utils/vnpay.util';
import { AppConfiguration } from '../../config/configuration';

// VNPay's published per-transaction ceiling for domestic cards/QR (100 million VND) — checked
// here so a too-large order fails with a clear message instead of a cryptic VNPay rejection.
const VNPAY_MAX_AMOUNT_VND = 100_000_000;

export interface BuildVnpayPaymentUrlInput {
  orderNumber: string;
  amount: number;
  ipAddr: string;
}

export interface VnpayCallback {
  valid: boolean;
  orderNumber: string;
  responseCode: string;
  amountVnd: number;
  transactionNo: string;
}

/** Lazily reads config on every call (not cached at construction) so booting the API without
 * VNPay credentials configured doesn't fail app startup — only actually building a payment URL
 * or verifying a callback fails, same posture as R2Service/ResendEmailService. */
@Injectable()
export class VnpayService {
  constructor(private readonly configService: ConfigService<AppConfiguration, true>) {}

  buildPaymentUrl(input: BuildVnpayPaymentUrlInput): string {
    const tmnCode = this.configService.get('vnpay.tmnCode', { infer: true });
    const hashSecret = this.configService.get('vnpay.hashSecret', { infer: true });
    const returnUrl = this.configService.get('vnpay.returnUrl', { infer: true });
    if (!tmnCode || !hashSecret || !returnUrl) {
      throw new InternalServerErrorException(
        'VNPay chưa được cấu hình (thiếu VNPAY_TMN_CODE/VNPAY_HASH_SECRET/VNPAY_RETURN_URL)',
      );
    }

    if (input.amount > VNPAY_MAX_AMOUNT_VND) {
      throw new BadRequestException(
        `Giá trị đơn hàng vượt quá hạn mức thanh toán VNPay (tối đa ${VNPAY_MAX_AMOUNT_VND.toLocaleString('vi-VN')}đ)`,
      );
    }

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(input.amount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: input.orderNumber,
      vnp_OrderInfo: `Thanh toan don hang ${input.orderNumber}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: input.ipAddr,
      vnp_CreateDate: formatVnpayCreateDate(new Date()),
    };

    const secureHash = buildVnpaySecureHash(params, hashSecret);
    const signedParams = { ...params, vnp_SecureHash: secureHash };
    const queryString = Object.entries(signedParams)
      .map(([key, value]) => `${key}=${encodeVnpayValue(value)}`)
      .join('&');

    const paymentUrl = this.configService.get('vnpay.paymentUrl', { infer: true });
    return `${paymentUrl}?${queryString}`;
  }

  /** Shared by both the return-URL (browser) and IPN (server-to-server) handlers — VNPay's
   * classic v2.1.0 API sends both as a GET with the identical `vnp_*` query shape. */
  parseAndVerifyCallback(query: Record<string, string>): VnpayCallback {
    const hashSecret = this.configService.get('vnpay.hashSecret', { infer: true });
    const valid = Boolean(hashSecret) && verifyVnpaySignature(query, hashSecret);

    return {
      valid,
      orderNumber: query.vnp_TxnRef ?? '',
      responseCode: query.vnp_ResponseCode ?? '',
      amountVnd: query.vnp_Amount ? Number(query.vnp_Amount) / 100 : 0,
      transactionNo: query.vnp_TransactionNo ?? '',
    };
  }
}
