'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FlashSaleInput } from '@repo/contracts';
import { adminFlashSalesApi } from '@/lib/api/admin/flash-sales';
import { deleteMutationCallbacks, writeMutationCallbacks } from '@/lib/admin-mutations';

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
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY]],
      'Đã thêm flash sale',
      'Không thể thêm flash sale',
    ),
  });
}

export function useUpdateFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FlashSaleInput }) =>
      adminFlashSalesApi.update(id, input),
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY], ['admin-flash-sale']],
      'Đã cập nhật flash sale',
      'Không thể cập nhật flash sale',
    ),
  });
}

export function useDeleteFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminFlashSalesApi.remove(id),
    ...deleteMutationCallbacks(
      queryClient,
      [LIST_KEY],
      'Đã xoá flash sale',
      'Không thể xoá flash sale',
    ),
  });
}
