import { PrismaService } from '../../infra/prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    order: { findUnique: jest.Mock; updateMany: jest.Mock };
    payment: { updateMany: jest.Mock };
    orderStatusHistory: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      order: { findUnique: jest.fn(), updateMany: jest.fn() },
      payment: { updateMany: jest.fn() },
      orderStatusHistory: { create: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          order: { findUnique: prisma.order.findUnique, updateMany: prisma.order.updateMany },
          payment: { updateMany: prisma.payment.updateMany },
          orderStatusHistory: { create: prisma.orderStatusHistory.create },
        }),
      ),
    };
    service = new PaymentsService(prisma as unknown as PrismaService);
  });

  const baseInput = {
    orderNumber: 'DTT1',
    responseCode: '00',
    transactionNo: 'VNP123',
    amountVnd: 100_000,
  };

  it('returns order_not_found when the order does not exist', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    const outcome = await service.confirmVnpayPayment(baseInput);

    expect(outcome).toBe('order_not_found');
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('returns order_not_found when the order was paid via COD, not VNPay', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      status: 'PENDING',
      payment: { method: 'COD', amount: 100_000 },
    });

    const outcome = await service.confirmVnpayPayment(baseInput);

    expect(outcome).toBe('order_not_found');
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('returns amount_mismatch and logs a history note without mutating Payment/Order when amounts differ', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      status: 'PENDING',
      payment: { method: 'VNPAY', amount: 100_000 },
    });

    const outcome = await service.confirmVnpayPayment({ ...baseInput, amountVnd: 90_000 });

    expect(outcome).toBe('amount_mismatch');
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ orderId: 'o1', status: 'PENDING' }),
    });
  });

  it('returns already_processed when the payment row is no longer PENDING (race with the other callback channel)', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      status: 'CONFIRMED',
      payment: { method: 'VNPAY', amount: 100_000 },
    });
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });

    const outcome = await service.confirmVnpayPayment(baseInput);

    expect(outcome).toBe('already_processed');
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('marks Payment PAID and Order CONFIRMED on a successful callback for a still-PENDING order', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      status: 'PENDING',
      payment: { method: 'VNPAY', amount: 100_000 },
    });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });

    const outcome = await service.confirmVnpayPayment(baseInput);

    expect(outcome).toBe('ok');
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'o1', status: 'PENDING' },
      data: { status: 'PAID', transactionId: 'VNP123', paidAt: expect.any(Date) },
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', status: 'PENDING' },
      data: { status: 'CONFIRMED' },
    });
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
      data: { orderId: 'o1', status: 'CONFIRMED', note: 'Thanh toán VNPay thành công' },
    });
  });

  it('marks Payment FAILED and leaves Order untouched on a declined callback', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      status: 'PENDING',
      payment: { method: 'VNPAY', amount: 100_000 },
    });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });

    const outcome = await service.confirmVnpayPayment({ ...baseInput, responseCode: '24' });

    expect(outcome).toBe('ok');
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'o1', status: 'PENDING' },
      data: { status: 'FAILED', transactionId: 'VNP123', paidAt: undefined },
    });
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ orderId: 'o1', status: 'PENDING' }),
    });
  });

  it('logs a manual-reconciliation history note when payment succeeds after the order already moved on', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      status: 'CANCELLED',
      payment: { method: 'VNPAY', amount: 100_000 },
    });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.updateMany.mockResolvedValue({ count: 0 });

    const outcome = await service.confirmVnpayPayment(baseInput);

    expect(outcome).toBe('ok');
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'o1',
        status: 'CANCELLED',
        note: expect.stringContaining('cần đối soát/hoàn tiền thủ công'),
      }),
    });
  });

  describe('confirmMomoPayment', () => {
    const momoBaseInput = {
      orderNumber: 'DTT1',
      isSuccess: true,
      resultCode: '0',
      transactionId: 'MOMO123',
      amountVnd: 100_000,
    };

    it('returns order_not_found when the order was paid via VNPay, not MoMo', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'PENDING',
        payment: { method: 'VNPAY', amount: 100_000 },
      });

      const outcome = await service.confirmMomoPayment(momoBaseInput);

      expect(outcome).toBe('order_not_found');
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('returns amount_mismatch without mutating Payment/Order when amounts differ', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'PENDING',
        payment: { method: 'MOMO', amount: 100_000 },
      });

      const outcome = await service.confirmMomoPayment({ ...momoBaseInput, amountVnd: 90_000 });

      expect(outcome).toBe('amount_mismatch');
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('returns already_processed when the payment row is no longer PENDING', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'CONFIRMED',
        payment: { method: 'MOMO', amount: 100_000 },
      });
      prisma.payment.updateMany.mockResolvedValue({ count: 0 });

      const outcome = await service.confirmMomoPayment(momoBaseInput);

      expect(outcome).toBe('already_processed');
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('marks Payment PAID and Order CONFIRMED on a successful callback', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'PENDING',
        payment: { method: 'MOMO', amount: 100_000 },
      });
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.order.updateMany.mockResolvedValue({ count: 1 });

      const outcome = await service.confirmMomoPayment(momoBaseInput);

      expect(outcome).toBe('ok');
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'o1', status: 'PENDING' },
        data: { status: 'PAID', transactionId: 'MOMO123', paidAt: expect.any(Date) },
      });
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: { orderId: 'o1', status: 'CONFIRMED', note: 'Thanh toán MoMo thành công' },
      });
    });

    it('marks Payment FAILED and leaves Order untouched on a declined callback', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'PENDING',
        payment: { method: 'MOMO', amount: 100_000 },
      });
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });

      const outcome = await service.confirmMomoPayment({
        ...momoBaseInput,
        isSuccess: false,
        resultCode: '1006',
      });

      expect(outcome).toBe('ok');
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'o1', status: 'PENDING' },
        data: { status: 'FAILED', transactionId: 'MOMO123', paidAt: undefined },
      });
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('logs a manual-reconciliation history note when payment succeeds after the order already moved on', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'CANCELLED',
        payment: { method: 'MOMO', amount: 100_000 },
      });
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.order.updateMany.mockResolvedValue({ count: 0 });

      const outcome = await service.confirmMomoPayment(momoBaseInput);

      expect(outcome).toBe('ok');
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'o1',
          status: 'CANCELLED',
          note: expect.stringContaining('cần đối soát/hoàn tiền thủ công'),
        }),
      });
    });
  });
});
