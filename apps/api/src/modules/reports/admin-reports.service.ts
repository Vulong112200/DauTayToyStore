import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import type {
  OrderStatusBreakdownItem,
  ReportRangeQuery,
  RevenueReportPoint,
  TopProductReportItem,
} from '@repo/contracts';
import { PrismaService } from '../../infra/prisma/prisma.service';

const EXCLUDED_REVENUE_STATUSES: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];
const DEFAULT_RANGE_DAYS = 30;

function bucketKey(date: Date, groupBy: 'day' | 'month'): string {
  const iso = date.toISOString();
  return groupBy === 'month' ? iso.slice(0, 7) : iso.slice(0, 10);
}

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenueOverTime(query: ReportRangeQuery): Promise<RevenueReportPoint[]> {
    const { from, to } = this.resolveRange(query);

    const orders = await this.prisma.order.findMany({
      where: {
        status: { notIn: EXCLUDED_REVENUE_STATUSES },
        createdAt: { gte: from, lte: to },
      },
      select: { createdAt: true, total: true },
    });

    const buckets = new Map<string, { revenue: number; orderCount: number }>();
    for (const order of orders) {
      const key = bucketKey(order.createdAt, query.groupBy);
      const existing = buckets.get(key) ?? { revenue: 0, orderCount: 0 };
      existing.revenue += order.total;
      existing.orderCount += 1;
      buckets.set(key, existing);
    }

    return Array.from(buckets.entries())
      .map(([bucket, value]) => ({ bucket, ...value }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));
  }

  async topProducts(limit: number): Promise<TopProductReportItem[]> {
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((row) => row.productId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((product) => [product.id, product.name]));

    return grouped.map((row) => ({
      productId: row.productId,
      productName: nameById.get(row.productId) ?? '(Sản phẩm đã bị xoá)',
      quantitySold: row._sum.quantity ?? 0,
      revenue: row._sum.lineTotal ?? 0,
    }));
  }

  async orderStatusBreakdown(): Promise<OrderStatusBreakdownItem[]> {
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return grouped.map((row) => ({ status: row.status, count: row._count._all }));
  }

  private resolveRange(query: ReportRangeQuery): { from: Date; to: Date } {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
    return { from, to };
  }
}
