'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useApplyCoupon,
  useCart,
  useRedeemVoucher,
  useRemoveCartItem,
  useRemoveCoupon,
  useRemoveVoucher,
  useUpdateCartItem,
} from '@/hooks/use-cart';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client';
import { toastError, toastSuccess } from '@/lib/toast';
import { formatVnd } from '@/lib/utils';

export function CartView() {
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();
  const [couponCode, setCouponCode] = React.useState('');
  const [couponError, setCouponError] = React.useState<string | null>(null);

  const redeemVoucher = useRedeemVoucher();
  const removeVoucher = useRemoveVoucher();
  const [voucherCode, setVoucherCode] = React.useState('');
  const [voucherError, setVoucherError] = React.useState<string | null>(null);

  async function handleApplyCoupon(event: React.FormEvent) {
    event.preventDefault();
    setCouponError(null);
    try {
      await applyCoupon.mutateAsync({ code: couponCode });
      setCouponCode('');
      toastSuccess('Đã áp dụng mã giảm giá');
    } catch (error) {
      setCouponError(error instanceof ApiError ? error.message : 'Không thể áp dụng mã giảm giá');
    }
  }

  async function handleRedeemVoucher(event: React.FormEvent) {
    event.preventDefault();
    setVoucherError(null);
    try {
      await redeemVoucher.mutateAsync({ code: voucherCode });
      setVoucherCode('');
      toastSuccess('Đã áp dụng phiếu quà tặng');
    } catch (error) {
      setVoucherError(error instanceof ApiError ? error.message : 'Không thể áp dụng phiếu quà tặng');
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
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
      <div className="space-y-4 lg:col-span-2">
        {cart.items.map((item) => (
          <div key={item.id} className="flex gap-4 rounded-2xl border border-border p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.productName}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl" aria-hidden>
                  🧸
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Link
                href={`/products/${item.productSlug}`}
                className="font-semibold hover:text-primary"
              >
                {item.productName}
              </Link>
              {item.variantName && (
                <span className="text-xs text-muted-foreground">{item.variantName}</span>
              )}
              <span className="font-display font-bold text-primary">
                {formatVnd(item.unitPrice)}
              </span>
              <div className="mt-auto flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-input">
                  <button
                    type="button"
                    className="p-1.5 disabled:opacity-50"
                    aria-label="Giảm số lượng"
                    title="Giảm số lượng"
                    disabled={updateItem.isPending || item.quantity <= 1}
                    onClick={() =>
                      updateItem.mutate(
                        {
                          itemId: item.id,
                          input: { quantity: item.quantity - 1 },
                        },
                        { onError: (error) => toastError(error, 'Không thể cập nhật số lượng') },
                      )
                    }
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    className="p-1.5 disabled:opacity-50"
                    aria-label="Tăng số lượng"
                    title="Tăng số lượng"
                    disabled={updateItem.isPending || item.quantity >= item.availableStock}
                    onClick={() =>
                      updateItem.mutate(
                        {
                          itemId: item.id,
                          input: { quantity: item.quantity + 1 },
                        },
                        { onError: (error) => toastError(error, 'Không thể cập nhật số lượng') },
                      )
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-destructive hover:underline disabled:opacity-50"
                  onClick={() =>
                    removeItem.mutate(item.id, {
                      onError: (error) => toastError(error, 'Không thể xoá sản phẩm'),
                    })
                  }
                  disabled={removeItem.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xoá
                </button>
              </div>
            </div>
            <div className="font-display font-bold">{formatVnd(item.lineTotal)}</div>
          </div>
        ))}
      </div>

      <div className="h-fit rounded-2xl border border-border p-6">
        <h2 className="font-display text-lg font-bold">Tóm tắt đơn hàng</h2>
        <div className="mt-4 flex justify-between text-sm">
          <span className="text-muted-foreground">Tạm tính ({cart.itemCount} sản phẩm)</span>
          <span className="font-medium">{formatVnd(cart.subtotal)}</span>
        </div>

        {cart.appliedPromotions.length > 0 && (
          <div className="mt-2 space-y-1">
            {cart.appliedPromotions.map((promo) => (
              <div key={promo.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  🎁 {promo.label}
                  {promo.timesApplied > 1 ? ` ×${promo.timesApplied}` : ''}
                </span>
                <span className="font-medium text-destructive">
                  -{formatVnd(promo.discountAmount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {cart.couponCode ? (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Mã giảm giá: <span className="font-medium text-foreground">{cart.couponCode}</span>
            </span>
            <button
              type="button"
              className="text-destructive hover:underline disabled:opacity-50"
              disabled={removeCoupon.isPending}
              onClick={() =>
                removeCoupon.mutate(undefined, {
                  onError: (error) => toastError(error, 'Không thể gỡ mã giảm giá'),
                })
              }
            >
              Gỡ mã
            </button>
          </div>
        ) : (
          <form onSubmit={handleApplyCoupon} className="mt-3 flex gap-2">
            <Input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder="Nhập mã giảm giá"
              aria-label="Mã giảm giá"
              className="h-9 text-sm"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={applyCoupon.isPending || !couponCode.trim()}
            >
              Áp dụng
            </Button>
          </form>
        )}
        {couponError && <p className="mt-1 text-xs text-destructive">{couponError}</p>}

        {cart.discountTotal > 0 && (
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Giảm giá</span>
            <span className="font-medium text-destructive">-{formatVnd(cart.discountTotal)}</span>
          </div>
        )}

        {cart.voucherCode ? (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Phiếu quà tặng:{' '}
              <span className="font-medium text-foreground">{cart.voucherCode}</span>
            </span>
            <button
              type="button"
              className="text-destructive hover:underline disabled:opacity-50"
              disabled={removeVoucher.isPending}
              onClick={() =>
                removeVoucher.mutate(undefined, {
                  onError: (error) => toastError(error, 'Không thể gỡ phiếu quà tặng'),
                })
              }
            >
              Gỡ phiếu
            </button>
          </div>
        ) : (
          <form onSubmit={handleRedeemVoucher} className="mt-3 flex gap-2">
            <Input
              value={voucherCode}
              onChange={(event) => setVoucherCode(event.target.value)}
              placeholder="Nhập mã phiếu quà tặng"
              aria-label="Mã phiếu quà tặng"
              className="h-9 text-sm"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={redeemVoucher.isPending || !voucherCode.trim()}
            >
              Áp dụng
            </Button>
          </form>
        )}
        {voucherError && <p className="mt-1 text-xs text-destructive">{voucherError}</p>}

        {cart.voucherDiscountTotal > 0 && (
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Phiếu quà tặng</span>
            <span className="font-medium text-destructive">
              -{formatVnd(cart.voucherDiscountTotal)}
            </span>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-4">
          <div className="flex justify-between font-display text-lg font-bold">
            <span>Tổng cộng</span>
            <span className="text-primary">{formatVnd(cart.total)}</span>
          </div>
          <Button size="lg" className="mt-4 w-full" asChild>
            <Link href="/checkout">Tiến hành thanh toán</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
