'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type CheckoutInput, checkoutSchema } from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/use-cart';
import { useCheckout } from '@/hooks/use-orders';
import { ApiError } from '@/lib/api-client';
import { formatVnd } from '@/lib/utils';

const LAST_ORDER_STORAGE_KEY = 'dautaytoy-last-order';

export function CheckoutForm() {
  const router = useRouter();
  const { data: cart, isLoading: isCartLoading } = useCart();
  const checkout = useCheckout();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutInput>({ resolver: zodResolver(checkoutSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const order = await checkout.mutateAsync(values);
      window.sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(order));
      router.push(`/order-confirmation/${order.orderNumber}`);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Không thể đặt hàng, vui lòng thử lại');
    }
  });

  if (isCartLoading) {
    return <p className="text-muted-foreground">Đang tải giỏ hàng...</p>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="text-5xl" aria-hidden>
          🛒
        </span>
        <p className="text-lg font-medium">Giỏ hàng của bạn đang trống</p>
        <Button asChild>
          <Link href="/products">Tiếp tục mua sắm</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <form onSubmit={onSubmit} className="space-y-4 lg:col-span-2" noValidate>
        <FormError message={serverError} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="customerName">Họ và tên người nhận</Label>
            <Input id="customerName" aria-invalid={!!errors.customerName} {...register('customerName')} />
            {errors.customerName && (
              <p className="text-xs text-destructive">{errors.customerName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customerPhone">Số điện thoại</Label>
            <Input id="customerPhone" aria-invalid={!!errors.customerPhone} {...register('customerPhone')} />
            {errors.customerPhone && (
              <p className="text-xs text-destructive">{errors.customerPhone.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="customerEmail">Email</Label>
          <Input
            id="customerEmail"
            type="email"
            aria-invalid={!!errors.customerEmail}
            {...register('customerEmail')}
          />
          {errors.customerEmail && (
            <p className="text-xs text-destructive">{errors.customerEmail.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Dùng email này để tra cứu đơn hàng sau này.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="shippingLine1">Địa chỉ giao hàng</Label>
          <Input
            id="shippingLine1"
            placeholder="Số nhà, tên đường"
            aria-invalid={!!errors.shippingLine1}
            {...register('shippingLine1')}
          />
          {errors.shippingLine1 && (
            <p className="text-xs text-destructive">{errors.shippingLine1.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="shippingWard">Phường/Xã (tuỳ chọn)</Label>
            <Input id="shippingWard" {...register('shippingWard')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shippingDistrict">Quận/Huyện (tuỳ chọn)</Label>
            <Input id="shippingDistrict" {...register('shippingDistrict')} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="shippingProvince">Tỉnh/Thành phố</Label>
            <Input
              id="shippingProvince"
              aria-invalid={!!errors.shippingProvince}
              {...register('shippingProvince')}
            />
            {errors.shippingProvince && (
              <p className="text-xs text-destructive">{errors.shippingProvince.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shippingPostalCode">Mã bưu điện (tuỳ chọn)</Label>
            <Input id="shippingPostalCode" {...register('shippingPostalCode')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note">Ghi chú (tuỳ chọn)</Label>
          <Input id="note" placeholder="Ví dụ: giao giờ hành chính" {...register('note')} />
        </div>

        <div className="rounded-2xl bg-muted/50 p-4 text-sm">
          <p className="font-semibold">Phương thức thanh toán</p>
          <p className="mt-1 text-muted-foreground">
            Thanh toán khi nhận hàng (COD) — hiện là phương thức duy nhất được hỗ trợ.
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={checkout.isPending}>
          {checkout.isPending ? 'Đang đặt hàng...' : `Đặt hàng (${formatVnd(cart.subtotal)})`}
        </Button>
      </form>

      <div className="h-fit rounded-2xl border border-border p-6">
        <h2 className="font-display text-lg font-bold">Đơn hàng của bạn</h2>
        <ul className="mt-4 space-y-3">
          {cart.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {item.productName} × {item.quantity}
              </span>
              <span className="font-medium">{formatVnd(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">Tạm tính ({cart.itemCount} sản phẩm)</span>
          <span className="font-medium">{formatVnd(cart.subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Phí vận chuyển sẽ được tính khi bạn xác nhận đặt hàng (miễn phí cho đơn từ 500.000₫).
        </p>
      </div>
    </div>
  );
}
