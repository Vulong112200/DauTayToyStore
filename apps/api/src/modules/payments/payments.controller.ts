import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AppConfiguration } from '../../config/configuration';
import { PaymentsService, VnpayConfirmOutcome } from './payments.service';
import { VnpayService } from './vnpay.service';

const IPN_RESPONSE_BY_OUTCOME: Record<VnpayConfirmOutcome, { RspCode: string; Message: string }> = {
  ok: { RspCode: '00', Message: 'Confirm Success' },
  already_processed: { RspCode: '02', Message: 'Order already confirmed' },
  order_not_found: { RspCode: '01', Message: 'Order not found' },
  amount_mismatch: { RspCode: '04', Message: 'Invalid amount' },
};
const IPN_INVALID_SIGNATURE = { RspCode: '97', Message: 'Invalid signature' };

/** Both routes are unauthenticated — VNPay calls them directly (browser redirect for `return`,
 * server-to-server for `ipn`), neither carries a Bearer token or `x-cart-session` header, so
 * neither uses `CartIdentityGuard` the way `POST /orders` does. Not decorated with `@AuditLog`:
 * that interceptor is oriented around a human admin actor, whereas the durable trail for these
 * machine callbacks is the `OrderStatusHistory` row `PaymentsService` already writes. */
@ApiTags('payments')
@Controller('payments/vnpay')
export class PaymentsController {
  constructor(
    private readonly vnpayService: VnpayService,
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService<AppConfiguration, true>,
  ) {}

  @Get('return')
  @Public()
  @Redirect()
  @ApiOperation({ summary: '[VNPay] Trình duyệt quay lại sau khi thanh toán' })
  async handleReturn(@Query() query: Record<string, string>) {
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

  @Get('ipn')
  @Public()
  @ApiOperation({ summary: '[VNPay] Webhook server-to-server xác nhận giao dịch (IPN)' })
  async handleIpn(@Query() query: Record<string, string>): Promise<{ RspCode: string; Message: string }> {
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
}
