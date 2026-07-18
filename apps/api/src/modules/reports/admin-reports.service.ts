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

    // Zero-fill every bucket in the range so the daily/monthly series is
    // contiguous — days with no orders would otherwise be dropped, leaving gaps
    // in the chart/table. enumerateBuckets returns keys already in chronological
    // order, so no separate sort is needed.
    return this.enumerateBuckets(from, to, query.groupBy).map((bucket) => ({
      bucket,
      ...(buckets.get(bucket) ?? { revenue: 0, orderCount: 0 }),
    }));
  }

  async topProducts(query: ReportRangeQuery, limit: number): Promise<TopProductReportItem[]> {
    const { from, to } = this.resolveRange(query);

    // Must mirror revenueOverTime's definition of "revenue": exclude
    // CANCELLED/REFUNDED orders and honour the same date range. Otherwise the two
    // Reports panels contradict each other (top-products used to count every
    // order item ever, including cancelled ones, with no date bound).
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: { notIn: EXCLUDED_REVENUE_STATUSES },
          createdAt: { gte: from, lte: to },
        },
      },
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

  /**
   * Every bucket key between `from` and `to` (inclusive), in chronological order,
   * using the same UTC-based key format as `bucketKey` so zero-filling lines up
   * with the real data buckets.
   */
  private enumerateBuckets(from: Date, to: Date, groupBy: 'day' | 'month'): string[] {
    const keys: string[] = [];
    if (groupBy === 'month') {
      const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
      const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
      while (cursor <= end) {
        keys.push(cursor.toISOString().slice(0, 7));
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    } else {
      const cursor = new Date(
        Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
      );
      const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
      while (cursor <= end) {
        keys.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    return keys;
  }
}
