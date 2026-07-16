'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminOrderQuery, UpdateOrderStatusInput } from '@repo/contracts';
import { adminOrdersApi } from '@/lib/api/admin/orders';

const LIST_KEY = 'admin-orders';

export function useAdminOrders(query: Partial<AdminOrderQuery>) {
  return useQuery({
    queryKey: [LIST_KEY, query],
    queryFn: () => adminOrdersApi.list(query),
  });
}

export function useAdminOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => adminOrdersApi.getById(id as string),
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateOrderStatusInput }) =>
      adminOrdersApi.updateStatus(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-order', data.id], data);
      queryClient.invalidateQueries({ queryKey: [LIST_KEY] });
    },
  });
}
