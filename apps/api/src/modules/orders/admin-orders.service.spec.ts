import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AdminOrdersService } from './admin-orders.service';

describe('AdminOrdersService', () => {
  let service: AdminOrdersService;
  let prisma: {
    order: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
    inventory: { updateMany: jest.Mock };
    giftVoucher: { update: jest.Mock };
    coupon: { updateMany: jest.Mock };
    flashSaleItem: { updateMany: jest.Mock };
    orderStatusHistory: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      order: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        // Compare-and-swap: default to a winning swap (one row updated).
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventory: { updateMany: jest.fn() },
      giftVoucher: { update: jest.fn() },
      coupon: { updateMany: jest.fn() },
      flashSaleItem: { updateMany: jest.fn() },
      orderStatusHistory: { create: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          order: { updateMany: prisma.order.updateMany },
          inventory: { updateMany: prisma.inventory.updateMany },
          giftVoucher: { update: prisma.giftVoucher.update },
          coupon: { updateMany: prisma.coupon.updateMany },
          flashSaleItem: { updateMany: prisma.flashSaleItem.updateMany },
          orderStatusHistory: { create: prisma.orderStatusHistory.create },
        }),
      ),
    };
    service = new AdminOrdersService(prisma as unknown as PrismaService);
  });

  describe('findList', () => {
    it('applies status and search filters', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      await service.findList({ page: 1, pageSize: 20, status: 'PENDING', q: 'DTT' });

      const [args] = prisma.order.findMany.mock.calls[0];
      expect(args.where).toMatchObject({
        status: 'PENDING',
        OR: [
          { orderNumber: { contains: 'DTT', mode: 'insensitive' } },
          { customerName: { contains: 'DTT', mode: 'insensitive' } },
          { customerEmail: { contains: 'DTT', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus('missing', { status: 'CONFIRMED' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException for an invalid transition', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'PENDING',
        items: [],
      });

      await expect(service.updateStatus('o1', { status: 'SHIPPED' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when transitioning from a terminal status', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'CANCELLED',
        items: [],
      });

      await expect(service.updateStatus('o1', { status: 'CONFIRMED' })).rejects.toThrow(
        BadRequestException,
      );
    });

    const fullOrderRow = {
      id: 'o1',
      orderNumber: 'DTT1',
      status: 'CANCELLED',
      subtotal: 100000,
      discountTotal: 0,
      shippingFee: 0,
      total: 100000,
      customerName: 'Nguyen Van A',
      customerEmail: 'a@example.com',
      customerPhone: '0912345678',
      shippingLine1: '123 Duong ABC',
      shippingLine2: null,
      shippingWard: null,
      shippingDistrict: null,
      shippingProvince: 'TP.HCM',
      shippingPostalCode: null,
      note: null,
      items: [],
      statusHistory: [],
      createdAt: new Date('2026-01-01'),
    };

    it('releases reserved inventory when cancelling', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce({
          id: 'o1',
          status: 'PENDING',
          items: [{ productId: 'p1', variantId: null, quantity: 2 }],
        })
        .mockResolvedValueOnce(fullOrderRow);

      await service.updateStatus('o1', { status: 'CANCELLED' });

      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { productId: 'p1' },
        data: { quantityReserved: { decrement: 2 } },
      });
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: { orderId: 'o1', status: 'CANCELLED', note: undefined },
      });
      expect(prisma.giftVoucher.update).not.toHaveBeenCalled();
    });

    it('refunds the gift voucher balance when cancelling an order that used one', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce({
          id: 'o1',
          status: 'PENDING',
          items: [{ productId: 'p1', variantId: null, quantity: 2 }],
          giftVoucherId: 'v1',
          giftVoucherAmount: 50_000,
        })
        .mockResolvedValueOnce(fullOrderRow);

      await service.updateStatus('o1', { status: 'CANCELLED' });

      expect(prisma.giftVoucher.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { balance: { increment: 50_000 }, redeemedAt: null },
      });
    });

    it('decrements both on-hand and reserved stock when shipping', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce({
          id: 'o1',
          status: 'PROCESSING',
          items: [{ productId: 'p1', variantId: null, quantity: 3 }],
        })
        .mockResolvedValueOnce({ ...fullOrderRow, status: 'SHIPPED' });

      await service.updateStatus('o1', { status: 'SHIPPED' });

      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { productId: 'p1' },
        data: { quantityOnHand: { decrement: 3 }, quantityReserved: { decrement: 3 } },
      });
    });

    it('aborts without touching inventory when the status was changed concurrently (CAS loses)', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: 'o1',
        status: 'PENDING',
        items: [{ productId: 'p1', variantId: null, quantity: 2, flashSaleItemId: null }],
      });
      // Someone else already moved the order on: the compare-and-swap matches zero rows.
      prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.updateStatus('o1', { status: 'CANCELLED' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
      expect(prisma.orderStatusHistory.create).not.toHaveBeenCalled();
    });

    it('refunds flash-sale soldCount and the coupon use when cancelling', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce({
          id: 'o1',
          status: 'PENDING',
          couponId: 'c1',
          items: [{ productId: 'p1', variantId: null, quantity: 2, flashSaleItemId: 'fsi1' }],
        })
        .mockResolvedValueOnce(fullOrderRow);

      await service.updateStatus('o1', { status: 'CANCELLED' });

      expect(prisma.flashSaleItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'fsi1' },
        data: { soldCount: { decrement: 2 } },
      });
      expect(prisma.coupon.updateMany).toHaveBeenCalledWith({
        where: { id: 'c1', usageCount: { gt: 0 } },
        data: { usageCount: { decrement: 1 } },
      });
    });

    it('does not touch soldCount for a non-flash line', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce({
          id: 'o1',
          status: 'PENDING',
          couponId: null,
          items: [{ productId: 'p1', variantId: null, quantity: 2, flashSaleItemId: null }],
        })
        .mockResolvedValueOnce(fullOrderRow);

      await service.updateStatus('o1', { status: 'CANCELLED' });

      expect(prisma.flashSaleItem.updateMany).not.toHaveBeenCalled();
      expect(prisma.coupon.updateMany).not.toHaveBeenCalled();
    });
  });
});
