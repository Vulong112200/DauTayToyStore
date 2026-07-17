import { PrismaService } from '../../infra/prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    product: { count: jest.Mock };
    order: { count: jest.Mock; aggregate: jest.Mock; findMany: jest.Mock };
    user: { count: jest.Mock };
    flashSale: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      product: { count: jest.fn() },
      order: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
      user: { count: jest.fn() },
      flashSale: { findMany: jest.fn() },
    };
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  it('aggregates totals and maps recent orders', async () => {
    prisma.product.count.mockResolvedValue(12);
    prisma.order.count.mockResolvedValue(34);
    prisma.user.count.mockResolvedValue(56);
    prisma.order.aggregate.mockResolvedValue({ _sum: { total: 1_000_000 } });
    prisma.order.findMany.mockResolvedValue([
      {
        orderNumber: 'DTT1',
        customerName: 'Nguyen Van A',
        status: 'PENDING',
        total: 100000,
        createdAt: new Date('2026-01-01'),
      },
    ]);
    prisma.flashSale.findMany.mockResolvedValue([
      { id: 'fs1', name: 'Flash sale hè', endsAt: new Date('2026-07-20'), _count: { items: 3 } },
    ]);

    const result = await service.getSummary();

    expect(result).toEqual({
      totalProducts: 12,
      totalOrders: 34,
      totalRevenue: 1_000_000,
      totalCustomers: 56,
      recentOrders: [
        {
          orderNumber: 'DTT1',
          customerName: 'Nguyen Van A',
          status: 'PENDING',
          total: 100000,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      activeFlashSales: [
        { id: 'fs1', name: 'Flash sale hè', endsAt: '2026-07-20T00:00:00.000Z', itemCount: 3 },
      ],
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { roles: { some: { role: { name: 'CUSTOMER' } } } },
    });
  });

  it('defaults total revenue to 0 when there are no orders', async () => {
    prisma.product.count.mockResolvedValue(0);
    prisma.order.count.mockResolvedValue(0);
    prisma.user.count.mockResolvedValue(0);
    prisma.order.aggregate.mockResolvedValue({ _sum: { total: null } });
    prisma.order.findMany.mockResolvedValue([]);
    prisma.flashSale.findMany.mockResolvedValue([]);

    const result = await service.getSummary();

    expect(result.totalRevenue).toBe(0);
  });
});
