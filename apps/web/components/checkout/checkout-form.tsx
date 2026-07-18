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
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { paymentMethod: 'COD' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const result = await checkout.mutateAsync(values);
      // Stash the order snapshot for the confirmation page BEFORE any redirect. For online
      // payment (VNPAY/MOMO) the browser leaves the SPA entirely and returns to
      // /order-confirmation/[orderNumber]; without this the page finds nothing in session and
      // falls back to "order not found in this session", so paying customers never see the
      // itemized success card. sessionStorage survives the gateway round-trip in the same tab.
      window.sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(result.order));
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
      router.push(`/order-confirmation/${result.order.orderNumber}`);
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
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2">
              <input type="radio" value="COD" {...register('paymentMethod')} />
              Thanh toán khi nhận hàng (COD)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" value="VNPAY" {...register('paymentMethod')} />
              Thanh toán qua VNPay (ATM/thẻ nội địa, Visa/Master/JCB, QR)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" value="MOMO" {...register('paymentMethod')} />
              Thanh toán qua ví MoMo
            </label>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={checkout.isPending}>
          {checkout.isPending ? 'Đang đặt hàng...' : `Đặt hàng (${formatVnd(cart.total)})`}
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
        {cart.appliedPromotions.map((promo) => (
          <div key={promo.id} className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">
              🎁 {promo.label}
              {promo.timesApplied > 1 ? ` ×${promo.timesApplied}` : ''}
            </span>
            <span className="font-medium text-destructive">-{formatVnd(promo.discountAmount)}</span>
          </div>
        ))}
        {cart.couponCode && (
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Mã giảm giá ({cart.couponCode})</span>
            <span className="font-medium text-destructive">
              -{formatVnd(cart.discountTotal)}
            </span>
          </div>
        )}
        {cart.voucherDiscountTotal > 0 && (
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Phiếu quà tặng</span>
            <span className="font-medium text-destructive">
              -{formatVnd(cart.voucherDiscountTotal)}
            </span>
          </div>
        )}
        <div className="mt-4 flex justify-between border-t border-border pt-4">
          <span className="font-display font-bold">Tổng cộng (tạm tính)</span>
          <span className="font-display font-bold text-primary">{formatVnd(cart.total)}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Chưa gồm phí vận chuyển — phí sẽ được tính khi bạn xác nhận đặt hàng (miễn phí cho đơn
          từ 500.000₫).
        </p>
      </div>
    </div>
  );
}
