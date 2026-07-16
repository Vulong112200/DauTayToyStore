'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddCartItemInput, ApplyCartCouponInput, UpdateCartItemInput } from '@repo/contracts';
import { cartApi } from '@/lib/api/cart';

export const CART_QUERY_KEY = ['cart'] as const;

export function useCart() {
  return useQuery({ queryKey: CART_QUERY_KEY, queryFn: cartApi.get });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddCartItemInput) => cartApi.addItem(input),
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
