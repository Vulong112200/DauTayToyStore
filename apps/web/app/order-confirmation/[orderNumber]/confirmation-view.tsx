'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import type { OrderView } from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { formatVnd } from '@/lib/utils';

const LAST_ORDER_STORAGE_KEY = 'dautaytoy-last-order';

export function OrderConfirmationView({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = React.useState<OrderView | null | undefined>(undefined);

  React.useEffect(() => {
    const raw = window.sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);
    if (!raw) {
      setOrder(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as OrderView;
      setOrder(parsed.orderNumber === orderNumber ? parsed : null);
    } catch {
      setOrder(null);
    }
  }, [orderNumber]);

  if (order === undefined) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }

  if (order === null) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-medium">Không tìm thấy thông tin đơn hàng trong phiên này</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Mã đơn hàng của bạn là <strong>{orderNumber}</strong>. Vui lòng dùng trang Tra cứu đơn
          hàng để xem chi tiết.
        </p>
        <Button asChild>
          <Link href={`/order-tracking?orderNumber=${encodeURIComponent(orderNumber)}`}>
            Tra cứu đơn hàng
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="h-14 w-14 text-green-500" aria-hidden />
        <h1 className="font-display text-2xl font-bold">Đặt hàng thành công!</h1>
        <p className="text-muted-foreground">
          Cảm ơn bạn đã mua sắm tại DauTayToy Store. Mã đơn hàng của bạn:
        </p>
        <p className="font-display text-xl font-bold text-primary">{order.orderNumber}</p>
      </div>

      <div className="mt-8 rounded-2xl border border-border p-6">
        <h2 className="font-display text-lg font-bold">Chi tiết đơn hàng</h2>
        <ul className="mt-4 space-y-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.productName} × {item.quantity}
              </span>
              <span className="font-medium">{formatVnd(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
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
      </div>

      <div className="mt-6 rounded-2xl bg-muted/50 p-4 text-sm">
        <p className="font-semibold">Giao đến</p>
        <p className="mt-1 text-muted-foreground">
          {order.customerName} — {order.customerPhone}
          <br />
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

      <div className="mt-8 flex justify-center gap-3">
        <Button variant="outline" asChild>
          <Link href="/products">Tiếp tục mua sắm</Link>
        </Button>
        <Button asChild>
          <Link href={`/order-tracking?orderNumber=${encodeURIComponent(order.orderNumber)}`}>
            Tra cứu đơn hàng
          </Link>
        </Button>
      </div>
    </div>
  );
}
