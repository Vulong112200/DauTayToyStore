'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminGiftVoucherQuery, GiftVoucherInput, UpdateGiftVoucherInput } from '@repo/contracts';
import { adminGiftVouchersApi } from '@/lib/api/admin/gift-vouchers';
import { deleteMutationCallbacks } from '@/lib/admin-mutations';

const LIST_KEY = 'admin-gift-vouchers';

export function useAdminGiftVouchers(query: Partial<AdminGiftVoucherQuery>) {
  return useQuery({
    queryKey: [LIST_KEY, query],
    queryFn: () => adminGiftVouchersApi.list(query),
  });
}

export function useCreateGiftVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GiftVoucherInput) => adminGiftVouchersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateGiftVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGiftVoucherInput }) =>
      adminGiftVouchersApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useDeleteGiftVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminGiftVouchersApi.remove(id),
    ...deleteMutationCallbacks(
      queryClient,
      [LIST_KEY],
      'Đã xoá phiếu quà tặng',
      'Không thể xoá phiếu quà tặng',
    ),
  });
}
