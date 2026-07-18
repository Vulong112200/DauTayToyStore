'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComboDealInput } from '@repo/contracts';
import { adminComboDealsApi } from '@/lib/api/admin/combo-deals';
import { deleteMutationCallbacks, writeMutationCallbacks } from '@/lib/admin-mutations';

const LIST_KEY = 'admin-combo-deals';

export function useAdminComboDeals() {
  return useQuery({ queryKey: [LIST_KEY], queryFn: () => adminComboDealsApi.list() });
}

export function useAdminComboDeal(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-combo-deal', id],
    queryFn: () => adminComboDealsApi.getById(id as string),
    enabled: !!id,
  });
}

export function useCreateComboDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ComboDealInput) => adminComboDealsApi.create(input),
    ...writeMutationCallbacks(queryClient, [[LIST_KEY]], 'Đã thêm combo', 'Không thể thêm combo'),
  });
}

export function useUpdateComboDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ComboDealInput }) =>
      adminComboDealsApi.update(id, input),
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY], ['admin-combo-deal']],
      'Đã cập nhật combo',
      'Không thể cập nhật combo',
    ),
  });
}

export function useDeleteComboDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminComboDealsApi.remove(id),
    ...deleteMutationCallbacks(
      queryClient,
      [LIST_KEY],
      'Đã xoá combo',
      'Không thể xoá combo',
    ),
  });
}
