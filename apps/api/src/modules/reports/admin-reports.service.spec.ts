import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AdminReportsService } from './admin-reports.service';

describe('AdminReportsService', () => {
  let service: AdminReportsService;
  let prisma: {
    order: { findMany: jest.Mock; groupBy: jest.Mock };
    orderItem: { groupBy: jest.Mock };
    product: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      order: { findMany: jest.fn(), groupBy: jest.fn() },
      orderItem: { groupBy: jest.fn() },
      product: { findMany: jest.fn() },
    };
    service = new AdminReportsService(prisma as unknown as PrismaService);
  });

  describe('revenueOverTime', () => {
    it('excludes cancelled/refunded orders from the query', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.revenueOverTime({ groupBy: 'day' });

      const [args] = prisma.order.findMany.mock.calls[0];
      expect(args.where.status.notIn).toEqual([OrderStatus.CANCELLED, OrderStatus.REFUNDED]);
    });

    it('buckets orders by day and sums revenue/orderCount', async () => {
      prisma.order.findMany.mockResolvedValue([
        { createdAt: new Date('2026-01-01T10:00:00.000Z'), total: 100_000 },
        { createdAt: new Date('2026-01-01T15:00:00.000Z'), total: 50_000 },
        { createdAt: new Date('2026-01-02T09:00:00.000Z'), total: 200_000 },
      ]);

      const result = await service.revenueOverTime({
        groupBy: 'day',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
      });

      expect(result).toEqual([
        { bucket: '2026-01-01', revenue: 150_000, orderCount: 2 },
        { bucket: '2026-01-02', revenue: 200_000, orderCount: 1 },
      ]);
    });

    it('zero-fills days that had no orders so the series is contiguous', async () => {
      prisma.order.findMany.mockResolvedValue([
        { createdAt: new Date('2026-01-01T10:00:00.000Z'), total: 100_000 },
        { createdAt: new Date('2026-01-03T09:00:00.000Z'), total: 200_000 },
      ]);

      const result = await service.revenueOverTime({
        groupBy: 'day',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-03T00:00:00.000Z',
      });

      expect(result).toEqual([
        { bucket: '2026-01-01', revenue: 100_000, orderCount: 1 },
        { bucket: '2026-01-02', revenue: 0, orderCount: 0 },
        { bucket: '2026-01-03', revenue: 200_000, orderCount: 1 },
      ]);
    });

    it('buckets orders by month when groupBy is month', async () => {
      prisma.order.findMany.mockResolvedValue([
        { createdAt: new Date('2026-01-05T00:00:00.000Z'), total: 100_000 },
        { createdAt: new Date('2026-01-20T00:00:00.000Z'), total: 100_000 },
        { createdAt: new Date('2026-02-01T00:00:00.000Z'), total: 100_000 },
      ]);

      const result = await service.revenueOverTime({
        groupBy: 'month',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
      });

      expect(result).toEqual([
        { bucket: '2026-01', revenue: 200_000, orderCount: 2 },
        { bucket: '2026-02', revenue: 100_000, orderCount: 1 },
      ]);
    });
  });

  describe('topProducts', () => {
    it('returns an empty array without querying products when there are no order items', async () => {
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.topProducts({ groupBy: 'day' }, 10);

      expect(result).toEqual([]);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('excludes cancelled/refunded orders and honours the date range (consistent with revenue)', async () => {
      prisma.orderItem.groupBy.mockResolvedValue([]);

      await service.topProducts(
        { groupBy: 'day', from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T00:00:00.000Z' },
        10,
      );

      const [args] = prisma.orderItem.groupBy.mock.calls[0];
      expect(args.where.order.status.notIn).toEqual([
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ]);
      expect(args.where.order.createdAt.gte).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(args.where.order.createdAt.lte).toEqual(new Date('2026-01-31T00:00:00.000Z'));
    });

    it('joins current product names onto the grouped totals', async () => {
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'p1', _sum: { quantity: 5, lineTotal: 500_000 } },
      ]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'LEGO City' }]);

      const result = await service.topProducts({ groupBy: 'day' }, 10);

      expect(result).toEqual([
        { productId: 'p1', productName: 'LEGO City', quantitySold: 5, revenue: 500_000 },
      ]);
    });

    it('falls back to a placeholder name when the product no longer exists', async () => {
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'missing', _sum: { quantity: 1, lineTotal: 10_000 } },
      ]);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.topProducts({ groupBy: 'day' }, 10);

      expect(result[0]?.productName).toBe('(Sản phẩm đã bị xoá)');
    });
  });

  describe('orderStatusBreakdown', () => {
    it('maps groupBy counts to the report shape', async () => {
      prisma.order.groupBy.mockResolvedValue([
        { status: OrderStatus.PENDING, _count: { _all: 3 } },
        { status: OrderStatus.DELIVERED, _count: { _all: 7 } },
      ]);

      const result = await service.orderStatusBreakdown();

      expect(result).toEqual([
        { status: OrderStatus.PENDING, count: 3 },
        { status: OrderStatus.DELIVERED, count: 7 },
      ]);
    });
  });
});
