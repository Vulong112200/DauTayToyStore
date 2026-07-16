'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type OrderTrackQuery, orderTrackQuerySchema } from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrderTracking } from '@/hooks/use-orders';
import { ApiError } from '@/lib/api-client';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { formatVnd } from '@/lib/utils';

export function OrderTrackingForm() {
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState<OrderTrackQuery | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderTrackQuery>({
    resolver: zodResolver(orderTrackQuerySchema),
    defaultValues: { orderNumber: searchParams.get('orderNumber') ?? '', email: '' },
  });

  const {
    data: order,
    isFetching,
    isError,
    error,
  } = useOrderTracking(query);

  const onSubmit = handleSubmit((values) => setQuery(values));

  return (
    <div className="mx-auto max-w-xl">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-border p-6"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="orderNumber">Mã đơn hàng</Label>
          <Input
            id="orderNumber"
            placeholder="DTT..."
            aria-invalid={!!errors.orderNumber}
            {...register('orderNumber')}
          />
          {errors.orderNumber && (
            <p className="text-xs text-destructive">{errors.orderNumber.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email đặt hàng</Label>
          <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isFetching}>
          {isFetching ? 'Đang tra cứu...' : 'Tra cứu đơn hàng'}
        </Button>
      </form>

      {isError && (
        <div className="mt-6">
          <FormError
            message={error instanceof ApiError ? error.message : 'Không thể tra cứu đơn hàng'}
          />
        </div>
      )}

      {order && (
        <div className="mt-8 rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{order.orderNumber}</h2>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>

          <ol className="mt-6 space-y-4 border-l-2 border-border pl-4">
            {order.statusHistory.map((entry, index) => (
              <li key={`${entry.status}-${entry.createdAt}`} className="relative">
                <span
                  className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
                    index === order.statusHistory.length - 1 ? 'bg-primary' : 'bg-muted-foreground'
                  }`}
                />
                <p className="text-sm font-semibold">{ORDER_STATUS_LABELS[entry.status] ?? entry.status}</p>
                {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString('vi-VN')}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sản phẩm</span>
              <span>{order.items.length} sản phẩm</span>
            </div>
            <div className="flex justify-between font-display text-base font-bold">
              <span>Tổng cộng</span>
              <span className="text-primary">{formatVnd(order.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
