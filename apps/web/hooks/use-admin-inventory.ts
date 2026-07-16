'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminInventoryQuery, UpdateInventoryInput } from '@repo/contracts';
import { adminInventoryApi } from '@/lib/api/admin/inventory';

const LIST_KEY = 'admin-inventory';

export function useAdminInventory(query: Partial<AdminInventoryQuery>) {
  return useQuery({
    queryKey: [LIST_KEY, query],
    queryFn: () => adminInventoryApi.list(query),
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: UpdateInventoryInput }) =>
      adminInventoryApi.update(productId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}
