'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import type { OrderStatus } from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { useAdminOrder, useUpdateOrderStatus } from '@/hooks/use-admin-orders';
import { ApiError } from '@/lib/api-client';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { formatVnd } from '@/lib/utils';

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: order, isLoading } = useAdminOrder(params.id);
  const updateStatus = useUpdateOrderStatus();
  const [nextStatus, setNextStatus] = React.useState<OrderStatus | ''>('');
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  if (isLoading || !order) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }

  async function handleUpdateStatus() {
    if (!nextStatus || !order) return;
    setError(null);
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        input: { status: nextStatus, note: note || undefined },
      });
      setNextStatus('');
      setNote('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật trạng thái');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Đơn hàng {order.orderNumber}</h1>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold">Sản phẩm</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.productName} ({item.sku}) × {item.quantity}
                  </span>
                  <span className="font-medium">{formatVnd(item.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính</span>
                <span>{formatVnd(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí vận chuyển</span>
                <span>{order.shippingFee === 0 ? 'Miễn phí' : formatVnd(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between font-display text-base font-bold">
                <span>Tổng cộng</span>
                <span className="text-primary">{formatVnd(order.total)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold">Lịch sử trạng thái</h2>
            <ol className="mt-4 space-y-4 border-l-2 border-border pl-4">
              {order.statusHistory.map((entry, index) => (
                <li key={`${entry.status}-${entry.createdAt}`} className="relative">
                  <span
                    className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
                      index === order.statusHistory.length - 1
                        ? 'bg-primary'
                        : 'bg-muted-foreground'
                    }`}
                  />
                  <p className="text-sm font-semibold">
                    {ORDER_STATUS_LABELS[entry.status] ?? entry.status}
                  </p>
                  {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString('vi-VN')}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 text-sm">
            <h2 className="font-display text-lg font-bold">Khách hàng</h2>
            <p className="mt-2">{order.customerName}</p>
            <p className="text-muted-foreground">{order.customerEmail}</p>
            <p className="text-muted-foreground">{order.customerPhone}</p>
            <div className="mt-4 border-t border-border pt-4">
              <p className="font-semibold">Địa chỉ giao hàng</p>
              <p className="mt-1 text-muted-foreground">
                {[
                  order.shippingAddress.line1,
                  order.shippingAddress.ward,
                  order.shippingAddress.district,
                  order.shippingAddress.province,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
            {order.note && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="font-semibold">Ghi chú</p>
                <p className="mt-1 text-muted-foreground">{order.note}</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold">Cập nhật trạng thái</h2>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <div className="mt-4 space-y-3">
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value as OrderStatus | '')}
                aria-label="Chọn trạng thái mới"
                className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
              >
                <option value="">-- Chọn trạng thái mới --</option>
                {STATUS_OPTIONS.filter((option) => option !== order.status).map((option) => (
                  <option key={option} value={option}>
                    {ORDER_STATUS_LABELS[option] ?? option}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ghi chú (tuỳ chọn)"
                aria-label="Ghi chú trạng thái"
                className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
              />
              <Button
                onClick={handleUpdateStatus}
                disabled={!nextStatus || updateStatus.isPending}
                className="w-full"
              >
                {updateStatus.isPending ? 'Đang cập nhật...' : 'Cập nhật'}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
