'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useAddToWishlist, useRemoveFromWishlist, useWishlist } from '@/hooks/use-wishlist';
import { cn } from '@/lib/utils';

export function WishlistButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { data: wishlist } = useWishlist(!!user);
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const isInWishlist = wishlist?.items.some((item) => item.productId === productId) ?? false;
  const isPending = addToWishlist.isPending || removeFromWishlist.isPending;

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      router.push('/login');
      return;
    }

    if (isInWishlist) {
      removeFromWishlist.mutate(productId);
    } else {
      addToWishlist.mutate({ productId });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={isInWishlist ? 'Xoá khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
      title={isInWishlist ? 'Xoá khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
      aria-pressed={isInWishlist}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full bg-background/90 shadow-sm transition-colors hover:bg-background disabled:opacity-50',
        className,
      )}
    >
      <Heart
        className={cn('h-4 w-4', isInWishlist ? 'fill-primary text-primary' : 'text-foreground')}
      />
    </button>
  );
}
