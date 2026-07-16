import { Injectable } from '@nestjs/common';
import type { DashboardSummary } from '@repo/contracts';
import { PrismaService } from '../../infra/prisma/prisma.service';

const RECENT_ORDERS_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<DashboardSummary> {
    const [totalProducts, totalOrders, totalCustomers, revenueAgg, recentOrders] =
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
    };
  }
}
