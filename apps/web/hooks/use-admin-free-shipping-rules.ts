'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FreeShippingRuleInput } from '@repo/contracts';
import { adminFreeShippingRulesApi } from '@/lib/api/admin/free-shipping-rules';

const LIST_KEY = 'admin-free-shipping-rules';

export function useAdminFreeShippingRules() {
  return useQuery({ queryKey: [LIST_KEY], queryFn: () => adminFreeShippingRulesApi.list() });
}

export function useCreateFreeShippingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FreeShippingRuleInput) => adminFreeShippingRulesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateFreeShippingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FreeShippingRuleInput }) =>
      adminFreeShippingRulesApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useDeleteFreeShippingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminFreeShippingRulesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}
