import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildMomoCallbackSignature, buildMomoRequestSignature, verifyMomoSignature } from '../../common/utils/momo.util';
import { AppConfiguration } from '../../config/configuration';

// MoMo's published per-transaction range for captureWallet (1,000 - 50,000,000 VND).
const MOMO_MIN_AMOUNT_VND = 1_000;
const MOMO_MAX_AMOUNT_VND = 50_000_000;

// Static merchant display info — not secrets, so hardcoded rather than env-configured (keeps
// the env surface limited to genuine credentials/URLs, same reasoning as VNPay's vnp_OrderType).
const PARTNER_NAME = 'DauTayToy Store';
const STORE_ID = 'DauTayToyStore';

export interface CreateMomoPaymentInput {
  orderNumber: string;
  amount: number;
}

interface MomoCreatePaymentResponse {
  resultCode: number;
  message?: string;
  payUrl?: string;
}

export interface MomoCallbackFields {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: string;
  orderInfo: string;
  orderType: string;
  transId: string;
  resultCode: string;
  message: string;
  payType: string;
  responseTime: string;
  extraData: string;
  signature: string;
}

export interface MomoCallback {
  valid: boolean;
  orderNumber: string;
  isSuccess: boolean;
  amountVnd: number;
  transactionNo: string;
  resultCode: string;
}

/** Lazily reads config on every call, same posture as VnpayService/R2Service: booting the API
 * without MoMo credentials configured doesn't fail app startup — only actually creating a
 * payment or verifying a callback fails. */
@Injectable()
export class MomoService {
  constructor(private readonly configService: ConfigService<AppConfiguration, true>) {}

  /**
   * Unlike VNPay's `buildPaymentUrl` (pure local URL construction), this makes a real outbound
   * POST to MoMo during checkout to obtain a `payUrl` — MoMo does not let us construct the
   * redirect URL ourselves. If this call fails (network error, MoMo 5xx, bad `resultCode`) after
   * the caller's Order+Payment(PENDING) row already committed, that Order is left PENDING with no
   * `payUrl` ever shown — a documented known gap (see docs/architecture.md), not auto-recovered.
   */
  async createPayment(input: CreateMomoPaymentInput): Promise<string> {
    const partnerCode = this.configService.get('momo.partnerCode', { infer: true });
    const accessKey = this.configService.get('momo.accessKey', { infer: true });
    const secretKey = this.configService.get('momo.secretKey', { infer: true });
    const redirectUrl = this.configService.get('momo.redirectUrl', { infer: true });
    const ipnUrl = this.configService.get('momo.ipnUrl', { infer: true });
    if (!partnerCode || !accessKey || !secretKey || !redirectUrl || !ipnUrl) {
      throw new InternalServerErrorException(
        'MoMo chưa được cấu hình (thiếu MOMO_PARTNER_CODE/MOMO_ACCESS_KEY/MOMO_SECRET_KEY/MOMO_REDIRECT_URL/MOMO_IPN_URL)',
      );
    }

    if (input.amount < MOMO_MIN_AMOUNT_VND || input.amount > MOMO_MAX_AMOUNT_VND) {
      throw new BadRequestException(
        `Giá trị đơn hàng phải trong khoảng ${MOMO_MIN_AMOUNT_VND.toLocaleString('vi-VN')}đ - ` +
          `${MOMO_MAX_AMOUNT_VND.toLocaleString('vi-VN')}đ để thanh toán qua MoMo`,
      );
    }

    // TODO(retry-payment): requestId/orderId are both reused as `orderNumber` because today
    // createPayment() is only ever called once per order. MoMo's own dedup is keyed off
    // requestId — a future "retry a failed MoMo payment" flow must mint a fresh requestId for
    // each attempt (it may keep reusing the same orderId), or MoMo will dedupe the retry against
    // the original request instead of treating it as a new attempt.
    const requestId = input.orderNumber;
    const orderId = input.orderNumber;
    const orderInfo = `Thanh toan don hang ${input.orderNumber}`;
    const amount = String(input.amount);
    const extraData = '';
    const requestType = 'captureWallet';

    const signature = buildMomoRequestSignature(
      { accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType },
      secretKey,
    );

    const endpoint = this.configService.get('momo.endpoint', { infer: true });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerCode,
        partnerName: PARTNER_NAME,
        storeId: STORE_ID,
        requestId,
        amount: input.amount,
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        lang: 'vi',
        extraData,
        requestType,
        signature,
      }),
    });

    const body = (await response.json().catch(() => null)) as MomoCreatePaymentResponse | null;
    if (!response.ok || !body || body.resultCode !== 0 || typeof body.payUrl !== 'string') {
      throw new InternalServerErrorException(
        `MoMo trả về lỗi khi khởi tạo thanh toán (resultCode ${body?.resultCode ?? 'N/A'}): ${body?.message ?? 'không rõ nguyên nhân'}`,
      );
    }

    return body.payUrl;
  }

  /** Shared by both the IPN (POST JSON body) and redirect (GET query params) handlers — MoMo's
   * docs confirm both carry the same field set. Callers must pass already-normalized string
   * values (e.g. `String(jsonBody.amount)` for the POST/IPN path) — see `momo.util.ts`. */
  parseAndVerifyCallback(fields: MomoCallbackFields): MomoCallback {
    const accessKey = this.configService.get('momo.accessKey', { infer: true });
    const secretKey = this.configService.get('momo.secretKey', { infer: true });

    const expectedSignature = accessKey && secretKey
      ? buildMomoCallbackSignature(
          {
            accessKey,
            amount: fields.amount,
            extraData: fields.extraData,
            message: fields.message,
            orderId: fields.orderId,
            orderInfo: fields.orderInfo,
            orderType: fields.orderType,
            partnerCode: fields.partnerCode,
            payType: fields.payType,
            requestId: fields.requestId,
            responseTime: fields.responseTime,
            resultCode: fields.resultCode,
            transId: fields.transId,
          },
          secretKey,
        )
      : null;

    const valid = Boolean(expectedSignature) && verifyMomoSignature(expectedSignature!, fields.signature);

    return {
      valid,
      orderNumber: fields.orderId,
      isSuccess: Number(fields.resultCode) === 0,
      amountVnd: Number(fields.amount),
      transactionNo: fields.transId,
      resultCode: fields.resultCode,
    };
  }
}
