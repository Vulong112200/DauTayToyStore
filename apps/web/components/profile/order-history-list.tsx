'use client';

import Link from 'next/link';
import { useMyOrders } from '@/hooks/use-orders';
import { formatVnd } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã huỷ',
  REFUNDED: 'Đã hoàn tiền',
};

export function OrderHistoryList() {
  const { data: orders, isLoading } = useMyOrders(true);

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;

  if (!orders || orders.length === 0) {
    return <p className="text-sm text-muted-foreground">Bạn chưa có đơn hàng nào.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link
          key={order.orderNumber}
          href={`/order-tracking?orderNumber=${encodeURIComponent(order.orderNumber)}`}
          className="flex items-center justify-between rounded-2xl border border-border p-4 text-sm transition-colors hover:border-primary"
        >
          <div>
            <p className="font-semibold">{order.orderNumber}</p>
            <p className="text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString('vi-VN')} · {order.itemCount} sản phẩm
            </p>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-primary">{formatVnd(order.total)}</p>
            <p className="text-xs text-muted-foreground">
              {STATUS_LABELS[order.status] ?? order.status}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
