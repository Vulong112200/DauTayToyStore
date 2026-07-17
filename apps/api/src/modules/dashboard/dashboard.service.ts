import { Injectable } from '@nestjs/common';
import type { DashboardSummary } from '@repo/contracts';
import { PrismaService } from '../../infra/prisma/prisma.service';

const RECENT_ORDERS_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<DashboardSummary> {
    const now = new Date();
    const [totalProducts, totalOrders, totalCustomers, revenueAgg, recentOrders, activeFlashSales] =
      await Promise.all([
        this.prisma.product.count({ where: { status: { not: 'ARCHIVED' } } }),
        this.prisma.order.count(),
        this.prisma.user.count({ where: { roles: { some: { role: { name: 'CUSTOMER' } } } } }),
        this.prisma.order.aggregate({
          _sum: { total: true },
          where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        }),
        this.prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          take: RECENT_ORDERS_LIMIT,
          select: {
            orderNumber: true,
            customerName: true,
            status: true,
            total: true,
            createdAt: true,
          },
        }),
        // Flash sales running right now — same active-window rule as the public
        // /flash-sales endpoint and the promotion engine — so the admin sees at a
        // glance whether a sale is live.
        this.prisma.flashSale.findMany({
          where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
          orderBy: { endsAt: 'asc' },
          select: { id: true, name: true, endsAt: true, _count: { select: { items: true } } },
        }),
      ]);

    return {
      totalProducts,
      totalOrders,
      totalRevenue: revenueAgg._sum.total ?? 0,
      totalCustomers,
      recentOrders: recentOrders.map((order) => ({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt.toISOString(),
      })),
      activeFlashSales: activeFlashSales.map((flashSale) => ({
        id: flashSale.id,
        name: flashSale.name,
        endsAt: flashSale.endsAt.toISOString(),
        itemCount: flashSale._count.items,
      })),
    };
  }
}
