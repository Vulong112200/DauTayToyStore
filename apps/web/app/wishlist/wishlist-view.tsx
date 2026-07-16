'use client';

import Link from 'next/link';
import { ProductCard } from '@/components/catalog/product-card';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/hooks/use-wishlist';
import { useAuthStore } from '@/store/auth-store';

export function WishlistView() {
  const user = useAuthStore((state) => state.user);
  const { data: wishlist, isLoading } = useWishlist(!!user);

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="text-5xl" aria-hidden>
          💗
        </span>
        <p className="text-lg font-medium">Đăng nhập để xem danh sách yêu thích</p>
        <Button asChild>
          <Link href="/login">Đăng nhập</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }

  if (!wishlist || wishlist.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="text-5xl" aria-hidden>
          💔
        </span>
        <p className="text-lg font-medium">Danh sách yêu thích của bạn đang trống</p>
        <Button asChild>
          <Link href="/products">Khám phá sản phẩm</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {wishlist.items.map((item) => (
        <ProductCard key={item.productId} product={item.product} />
      ))}
    </div>
  );
}
