import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

export type VnpayConfirmOutcome =
  | 'ok'
  | 'already_processed'
  | 'order_not_found'
  | 'amount_mismatch';

export interface ConfirmVnpayPaymentInput {
  orderNumber: string;
  responseCode: string;
  transactionNo: string;
  amountVnd: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Called identically by both the VNPay return-URL and IPN handlers (dual-channel
   * confirmation), so this must be safe to run twice concurrently for the same order. The
   * atomicity boundary is the `payment.updateMany({ where: { ..., status: PENDING } })` call
   * below, not a `findUnique`-then-branch — Postgres re-checks an UPDATE's WHERE clause after
   * acquiring the row lock, so a second concurrent call's `updateMany` blocks until the first
   * commits, then sees the row is no longer PENDING and matches zero rows. A prior read-then-
   * branch design would have let both concurrent calls "win" the race.
   */
  async confirmVnpayPayment(input: ConfirmVnpayPaymentInput): Promise<VnpayConfirmOutcome> {
    const { orderNumber, responseCode, transactionNo, amountVnd } = input;
    const isSuccess = responseCode === '00';

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { orderNumber },
        include: { payment: true },
      });

      if (!order || !order.payment || order.payment.method !== 'VNPAY') {
        this.logger.warn(`VNPay callback for unknown/non-VNPay order: ${orderNumber}`);
        return 'order_not_found';
      }

      if (order.payment.amount !== amountVnd) {
        this.logger.error(
          `VNPay amount mismatch for order ${orderNumber}: expected ${order.payment.amount}đ, got ${amountVnd}đ`,
        );
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: order.status,
            note: `VNPay báo số tiền không khớp (nhận ${amountVnd}đ, đơn hàng ${order.payment.amount}đ) — giao dịch bị từ chối`,
          },
        });
        return 'amount_mismatch';
      }

      const paymentUpdate = await tx.payment.updateMany({
        where: { orderId: order.id, status: PaymentStatus.PENDING },
        data: {
          status: isSuccess ? PaymentStatus.PAID : PaymentStatus.FAILED,
          transactionId: transactionNo,
          paidAt: isSuccess ? new Date() : undefined,
        },
      });

      if (paymentUpdate.count === 0) {
        // The other callback channel (return URL vs IPN) already processed this payment first.
        return 'already_processed';
      }

      if (!isSuccess) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: order.status,
            note: `Thanh toán VNPay thất bại (mã lỗi ${responseCode})`,
          },
        });
        return 'ok';
      }

      const orderUpdate = await tx.order.updateMany({
        where: { id: order.id, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CONFIRMED },
      });

      if (orderUpdate.count === 1) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: OrderStatus.CONFIRMED,
            note: 'Thanh toán VNPay thành công',
          },
        });
      } else {
        // Money arrived for an order the shop already moved on from (e.g. an admin cancelled it
        // while payment was in flight). No automatic refund is wired up yet — see
        // docs/architecture.md — so this must be loud enough for a human to find and reconcile.
        this.logger.error(
          `VNPay payment succeeded for order ${orderNumber} but its status is no longer PENDING (now ${order.status}) — needs manual reconciliation/refund`,
        );
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: order.status,
            note: 'Nhận thanh toán VNPay thành công sau khi đơn đã đổi trạng thái — cần đối soát/hoàn tiền thủ công',
          },
        });
      }

      return 'ok';
    });
  }
}
