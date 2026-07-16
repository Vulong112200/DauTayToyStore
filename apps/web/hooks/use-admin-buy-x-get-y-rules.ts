'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BuyXGetYRuleInput } from '@repo/contracts';
import { adminBuyXGetYRulesApi } from '@/lib/api/admin/buy-x-get-y-rules';

const LIST_KEY = 'admin-buy-x-get-y-rules';

export function useAdminBuyXGetYRules() {
  return useQuery({ queryKey: [LIST_KEY], queryFn: () => adminBuyXGetYRulesApi.list() });
}

export function useCreateBuyXGetYRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BuyXGetYRuleInput) => adminBuyXGetYRulesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateBuyXGetYRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BuyXGetYRuleInput }) =>
      adminBuyXGetYRulesApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useDeleteBuyXGetYRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBuyXGetYRulesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}
