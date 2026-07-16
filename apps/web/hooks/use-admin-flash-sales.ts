'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FlashSaleInput } from '@repo/contracts';
import { adminFlashSalesApi } from '@/lib/api/admin/flash-sales';

const LIST_KEY = 'admin-flash-sales';

export function useAdminFlashSales() {
  return useQuery({ queryKey: [LIST_KEY], queryFn: () => adminFlashSalesApi.list() });
}

export function useAdminFlashSale(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-flash-sale', id],
    queryFn: () => adminFlashSalesApi.getById(id as string),
    enabled: !!id,
  });
}

export function useCreateFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FlashSaleInput) => adminFlashSalesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FlashSaleInput }) =>
      adminFlashSalesApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useDeleteFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminFlashSalesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}
