'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductListItem, WishlistView } from '@repo/contracts';
import { wishlistApi } from '@/lib/api/wishlist';

export const WISHLIST_QUERY_KEY = ['wishlist'] as const;

export function useWishlist(enabled: boolean) {
  return useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: wishlistApi.get,
    enabled,
  });
}

// Optimistic add: the heart fills the instant it's clicked instead of waiting a
// full API round-trip (which, on the free Render tier, can include a cold start).
// We carry the full `product` in the mutation variables — only `productId` is
// sent to the server — so the wishlist cache holds a real item during the
// in-flight window, then onSuccess replaces it with the authoritative response.
export function useAddToWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId }: { productId: string; product: ProductListItem }) =>
      wishlistApi.addItem({ productId }),
    onMutate: async ({ productId, product }) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEY });
      const previous = queryClient.getQueryData<WishlistView>(WISHLIST_QUERY_KEY);
      queryClient.setQueryData<WishlistView>(WISHLIST_QUERY_KEY, (current) => {
        const items = current?.items ?? [];
        if (items.some((item) => item.productId === productId)) return { items };
        return { items: [{ productId, addedAt: new Date().toISOString(), product }, ...items] };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(WISHLIST_QUERY_KEY, context.previous);
    },
    onSuccess: (data) => queryClient.setQueryData(WISHLIST_QUERY_KEY, data),
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => wishlistApi.removeItem(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEY });
      const previous = queryClient.getQueryData<WishlistView>(WISHLIST_QUERY_KEY);
      queryClient.setQueryData<WishlistView>(WISHLIST_QUERY_KEY, (current) =>
        current ? { items: current.items.filter((item) => item.productId !== productId) } : current,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(WISHLIST_QUERY_KEY, context.previous);
    },
    onSuccess: (data) => queryClient.setQueryData(WISHLIST_QUERY_KEY, data),
  });
}
