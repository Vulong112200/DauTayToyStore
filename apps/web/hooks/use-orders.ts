'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CheckoutInput, OrderTrackQuery } from '@repo/contracts';
import { ordersApi } from '@/lib/api/orders';
import { CART_QUERY_KEY } from './use-cart';
import { useAuthReady } from './use-auth-ready';

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) => ordersApi.checkout(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

export function useOrderTracking(query: OrderTrackQuery | null) {
  return useQuery({
    queryKey: ['order-tracking', query],
    queryFn: () => ordersApi.track(query as OrderTrackQuery),
    enabled: query !== null,
    retry: false,
  });
}

export function useMyOrders(enabled: boolean) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: ['my-orders'],
    queryFn: ordersApi.listMine,
    enabled: enabled && authReady,
    staleTime: 2 * 60 * 1000,
  });
}
