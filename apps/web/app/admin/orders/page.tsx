'use client';

import * as React from 'react';
import Link from 'next/link';
import type { OrderStatus } from '@repo/contracts';
import { useAdminOrders } from '@/hooks/use-admin-orders';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { formatVnd } from '@/lib/utils';

const STATUS_OPTIONS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPED', label: 'Đang giao hàng' },
  { value: 'DELIVERED', label: 'Đã giao hàng' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
];

export default function AdminOrdersPage() {
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState<OrderStatus | ''>('');
  const { data, isLoading } = useAdminOrders({
    page,
    pageSize: 20,
    q: q || undefined,
    status: status || undefined,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Đơn hàng</h1>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo mã đơn, tên hoặc email khách hàng..."
          aria-label="Tìm kiếm đơn hàng"
          className="w-full max-w-sm rounded-xl border border-input bg-background px-4 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as OrderStatus | '');
            setPage(1);
          }}
          aria-label="Lọc theo trạng thái"
          className="rounded-xl border border-input bg-background px-4 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-muted-foreground">Không tìm thấy đơn hàng nào.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">Mã đơn hàng</th>
                  <th className="p-4 font-medium">Khách hàng</th>
                  <th className="p-4 font-medium">Trạng thái</th>
                  <th className="p-4 font-medium">Ngày đặt</th>
                  <th className="p-4 text-right font-medium">Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="p-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="p-4">
                      <p>{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                    </td>
                    <td className="p-4">{ORDER_STATUS_LABELS[order.status] ?? order.status}</td>
                    <td className="p-4">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="p-4 text-right font-semibold">{formatVnd(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-xl border border-input px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-muted-foreground">
              Trang {data.meta.page} / {data.meta.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl border border-input px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </>
      )}
    </div>
  );
}
