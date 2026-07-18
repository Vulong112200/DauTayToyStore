'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddressInput } from '@repo/contracts';
import { addressesApi } from '@/lib/api/addresses';
import { useAuthReady } from './use-auth-ready';

export const ADDRESSES_QUERY_KEY = ['addresses'] as const;

// Addresses rarely change within a session; 5 min stale window avoids a refetch on
// every profile-page remount. Mutations invalidate this key explicitly below.
export function useAddresses(enabled: boolean) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: addressesApi.list,
    enabled: enabled && authReady,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddressInput) => addressesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY }),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddressInput }) =>
      addressesApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => addressesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY }),
  });
}
