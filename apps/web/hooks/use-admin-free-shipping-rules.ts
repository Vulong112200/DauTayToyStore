'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FreeShippingRuleInput } from '@repo/contracts';
import { adminFreeShippingRulesApi } from '@/lib/api/admin/free-shipping-rules';
import { deleteMutationCallbacks, writeMutationCallbacks } from '@/lib/admin-mutations';

const LIST_KEY = 'admin-free-shipping-rules';

export function useAdminFreeShippingRules() {
  return useQuery({ queryKey: [LIST_KEY], queryFn: () => adminFreeShippingRulesApi.list() });
}

export function useCreateFreeShippingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FreeShippingRuleInput) => adminFreeShippingRulesApi.create(input),
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY]],
      'Đã thêm quy tắc miễn phí vận chuyển',
      'Không thể thêm quy tắc miễn phí vận chuyển',
    ),
  });
}

export function useUpdateFreeShippingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FreeShippingRuleInput }) =>
      adminFreeShippingRulesApi.update(id, input),
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY]],
      'Đã cập nhật quy tắc miễn phí vận chuyển',
      'Không thể cập nhật quy tắc miễn phí vận chuyển',
    ),
  });
}

export function useDeleteFreeShippingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminFreeShippingRulesApi.remove(id),
    ...deleteMutationCallbacks(
      queryClient,
      [LIST_KEY],
      'Đã xoá quy tắc miễn phí vận chuyển',
      'Không thể xoá quy tắc miễn phí vận chuyển',
    ),
  });
}
