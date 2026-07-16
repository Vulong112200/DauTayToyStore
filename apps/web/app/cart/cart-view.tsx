'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks/use-cart';
import { formatVnd } from '@/lib/utils';

export function CartView() {
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  if (isLoading) {
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
                    disabled={updateItem.isPending || item.quantity <= 1}
                    onClick={() =>
                      updateItem.mutate({
                        itemId: item.id,
                        input: { quantity: item.quantity - 1 },
                      })
                    }
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    className="p-1.5 disabled:opacity-50"
                    aria-label="Tăng số lượng"
                    disabled={updateItem.isPending || item.quantity >= item.availableStock}
                    onClick={() =>
                      updateItem.mutate({
                        itemId: item.id,
                        input: { quantity: item.quantity + 1 },
                      })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-destructive hover:underline disabled:opacity-50"
                  onClick={() => removeItem.mutate(item.id)}
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
        <div className="mt-6 border-t border-border pt-4">
          <div className="flex justify-between font-display text-lg font-bold">
            <span>Tổng cộng</span>
            <span className="text-primary">{formatVnd(cart.subtotal)}</span>
          </div>
          <Button size="lg" className="mt-4 w-full" asChild>
            <Link href="/checkout">Tiến hành thanh toán</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
