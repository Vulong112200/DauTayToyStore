import { Body, Controller, Get, HttpCode, Post, Query, Redirect } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AppConfiguration } from '../../config/configuration';
import { MomoService } from './momo.service';
import { PaymentConfirmOutcome, PaymentsService } from './payments.service';
import { VnpayService } from './vnpay.service';

const IPN_RESPONSE_BY_OUTCOME: Record<PaymentConfirmOutcome, { RspCode: string; Message: string }> = {
  ok: { RspCode: '00', Message: 'Confirm Success' },
  already_processed: { RspCode: '02', Message: 'Order already confirmed' },
  order_not_found: { RspCode: '01', Message: 'Order not found' },
  amount_mismatch: { RspCode: '04', Message: 'Invalid amount' },
};
const IPN_INVALID_SIGNATURE = { RspCode: '97', Message: 'Invalid signature' };

interface MomoIpnBody {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: string;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

/** All routes are unauthenticated — VNPay/MoMo call them directly (browser redirect for
 * `return`, server-to-server for `ipn`), neither carries a Bearer token or `x-cart-session`
 * header, so neither uses `CartIdentityGuard` the way `POST /orders` does. Not decorated with
 * `@AuditLog`: that interceptor is oriented around a human admin actor, whereas the durable
 * trail for these machine callbacks is the `OrderStatusHistory` row `PaymentsService` already
 * writes. */
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly vnpayService: VnpayService,
    private readonly momoService: MomoService,
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService<AppConfiguration, true>,
  ) {}

  @Get('vnpay/return')
  @Public()
  @Redirect()
  @ApiOperation({ summary: '[VNPay] Trình duyệt quay lại sau khi thanh toán' })
  async handleVnpayReturn(@Query() query: Record<string, string>) {
    const frontendBase = this.configService.get('corsOrigin', { infer: true });
    const callback = this.vnpayService.parseAndVerifyCallback(query);
    const orderNumber = encodeURIComponent(callback.orderNumber);

    if (!callback.valid) {
      return { url: `${frontendBase}/order-confirmation/${orderNumber}?paymentStatus=invalid` };
    }

    const outcome = await this.paymentsService.confirmVnpayPayment({
      orderNumber: callback.orderNumber,
      responseCode: callback.responseCode,
      transactionNo: callback.transactionNo,
      amountVnd: callback.amountVnd,
    });

    const paymentStatus =
      outcome === 'order_not_found'
        ? 'invalid'
        : outcome === 'amount_mismatch'
          ? 'failed'
          : callback.responseCode === '00'
            ? 'success'
            : 'failed';

    return { url: `${frontendBase}/order-confirmation/${orderNumber}?paymentStatus=${paymentStatus}` };
  }

  @Get('vnpay/ipn')
  @Public()
  @ApiOperation({ summary: '[VNPay] Webhook server-to-server xác nhận giao dịch (IPN)' })
  async handleVnpayIpn(@Query() query: Record<string, string>): Promise<{ RspCode: string; Message: string }> {
    const callback = this.vnpayService.parseAndVerifyCallback(query);
    if (!callback.valid) {
      return IPN_INVALID_SIGNATURE;
    }

    const outcome = await this.paymentsService.confirmVnpayPayment({
      orderNumber: callback.orderNumber,
      responseCode: callback.responseCode,
      transactionNo: callback.transactionNo,
      amountVnd: callback.amountVnd,
    });

    return IPN_RESPONSE_BY_OUTCOME[outcome];
  }

  @Get('momo/return')
  @Public()
  @Redirect()
  @ApiOperation({ summary: '[MoMo] Trình duyệt quay lại sau khi thanh toán' })
  async handleMomoReturn(@Query() query: Record<string, string>) {
    const frontendBase = this.configService.get('corsOrigin', { infer: true });
    // MoMo's redirect delivers the same field set as its IPN, all as query strings already.
    const callback = this.momoService.parseAndVerifyCallback({
      partnerCode: query.partnerCode ?? '',
      orderId: query.orderId ?? '',
      requestId: query.requestId ?? '',
      amount: query.amount ?? '',
      orderInfo: query.orderInfo ?? '',
      orderType: query.orderType ?? '',
      transId: query.transId ?? '',
      resultCode: query.resultCode ?? '',
      message: query.message ?? '',
      payType: query.payType ?? '',
      responseTime: query.responseTime ?? '',
      extraData: query.extraData ?? '',
      signature: query.signature ?? '',
    });
    const orderNumber = encodeURIComponent(callback.orderNumber);

    if (!callback.valid) {
      return { url: `${frontendBase}/order-confirmation/${orderNumber}?paymentStatus=invalid` };
    }

    const outcome = await this.paymentsService.confirmMomoPayment({
      orderNumber: callback.orderNumber,
      isSuccess: callback.isSuccess,
      resultCode: callback.resultCode,
      transactionId: callback.transactionNo,
      amountVnd: callback.amountVnd,
    });

    const paymentStatus =
      outcome === 'order_not_found'
        ? 'invalid'
        : outcome === 'amount_mismatch'
          ? 'failed'
          : callback.isSuccess
            ? 'success'
            : 'failed';

    return { url: `${frontendBase}/order-confirmation/${orderNumber}?paymentStatus=${paymentStatus}` };
  }

  @Post('momo/ipn')
  @Public()
  @HttpCode(204)
  @ApiOperation({ summary: '[MoMo] Webhook server-to-server xác nhận giao dịch (IPN) — POST JSON, phản hồi 204' })
  async handleMomoIpn(@Body() body: MomoIpnBody): Promise<void> {
    // MoMo's IPN body carries real JSON types (amount/resultCode/responseTime as numbers) — the
    // signature was computed by MoMo over their plain-decimal string form, so normalize here
    // before verifying, not inside the pure signing/verifying util.
    const callback = this.momoService.parseAndVerifyCallback({
      partnerCode: body.partnerCode,
      orderId: body.orderId,
      requestId: body.requestId,
      amount: String(body.amount),
      orderInfo: body.orderInfo,
      orderType: body.orderType,
      transId: body.transId,
      resultCode: String(body.resultCode),
      message: body.message,
      payType: body.payType,
      responseTime: String(body.responseTime),
      extraData: body.extraData,
      signature: body.signature,
    });

    if (!callback.valid) return;

    await this.paymentsService.confirmMomoPayment({
      orderNumber: callback.orderNumber,
      isSuccess: callback.isSuccess,
      resultCode: callback.resultCode,
      transactionId: callback.transactionNo,
      amountVnd: callback.amountVnd,
    });
    // MoMo requires a bare HTTP 204 within 15s — no JSON body, unlike VNPay's {RspCode,Message}.
  }
}
