'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddWishlistItemInput } from '@repo/contracts';
import { wishlistApi } from '@/lib/api/wishlist';

export const WISHLIST_QUERY_KEY = ['wishlist'] as const;

export function useWishlist(enabled: boolean) {
  return useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: wishlistApi.get,
    enabled,
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddWishlistItemInput) => wishlistApi.addItem(input),
    onSuccess: (data) => queryClient.setQueryData(WISHLIST_QUERY_KEY, data),
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => wishlistApi.removeItem(productId),
    onSuccess: (data) => queryClient.setQueryData(WISHLIST_QUERY_KEY, data),
  });
}
