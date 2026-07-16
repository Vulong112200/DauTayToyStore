'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComboDealInput } from '@repo/contracts';
import { adminComboDealsApi } from '@/lib/api/admin/combo-deals';

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateComboDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ComboDealInput }) =>
      adminComboDealsApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useDeleteComboDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminComboDealsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}
