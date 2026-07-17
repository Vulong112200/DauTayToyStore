'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import type { ProductListItem } from '@repo/contracts';
import { useAuthStore } from '@/store/auth-store';
import { useAddToWishlist, useIsInWishlist, useRemoveFromWishlist } from '@/hooks/use-wishlist';
import { cn } from '@/lib/utils';

function WishlistButtonImpl({
  product,
  className,
}: {
  product: ProductListItem;
  className?: string;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { data: isInWishlist = false } = useIsInWishlist(product.id, !!user);
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  // Guard against rapid double-clicks racing two mutations to out-of-order
  // resolution — but note the heart itself already reflects the change
  // optimistically, so this disable is invisible, not the old "frozen" feel.
  const isPending = addToWishlist.isPending || removeFromWishlist.isPending;

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      router.push('/login');
      return;
    }

    if (isInWishlist) {
      removeFromWishlist.mutate(product.id);
    } else {
      addToWishlist.mutate({ productId: product.id, product });
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
        'flex h-9 w-9 items-center justify-center rounded-full bg-background/90 shadow-sm transition-colors hover:bg-background',
        className,
      )}
    >
      <Heart
        className={cn('h-4 w-4', isInWishlist ? 'fill-primary text-primary' : 'text-foreground')}
      />
    </button>
  );
}

export const WishlistButton = React.memo(WishlistButtonImpl);
