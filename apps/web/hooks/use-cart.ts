'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddCartItemInput,
  ApplyCartCouponInput,
  CartView,
  RedeemGiftVoucherInput,
  UpdateCartItemInput,
} from '@repo/contracts';
import { cartApi } from '@/lib/api/cart';

export const CART_QUERY_KEY = ['cart'] as const;

export function useCart() {
  return useQuery({ queryKey: CART_QUERY_KEY, queryFn: cartApi.get });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddCartItemInput) => cartApi.addItem(input),
    // Optimistically bump only the header badge count so it reacts instantly,
    // without faking the server-computed line items / promotions / totals (which
    // stay authoritative and are replaced wholesale by onSuccess). The full cart
    // page isn't mounted while adding from a product page, so the count is the
    // only visible surface until the real response arrives.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = queryClient.getQueryData<CartView>(CART_QUERY_KEY);
      if (previous) {
        queryClient.setQueryData<CartView>(CART_QUERY_KEY, {
          ...previous,
          itemCount: previous.itemCount + (input.quantity ?? 1),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(CART_QUERY_KEY, context.previous);
    },
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: UpdateCartItemInput }) =>
      cartApi.updateItem(itemId, input),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useApplyCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyCartCouponInput) => cartApi.applyCoupon(input),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useRedeemVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RedeemGiftVoucherInput) => cartApi.redeemVoucher(input),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useRemoveVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.removeVoucher(),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}
