'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminProductQuery, ProductInput } from '@repo/contracts';
import { adminProductsApi } from '@/lib/api/admin/products';
import { deleteMutationCallbacks } from '@/lib/admin-mutations';

const LIST_KEY = 'admin-products';

export function useAdminProducts(query: Partial<AdminProductQuery>) {
  return useQuery({
    queryKey: [LIST_KEY, query],
    queryFn: () => adminProductsApi.list(query),
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => adminProductsApi.getById(id as string),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) => adminProductsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductInput }) =>
      adminProductsApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProductsApi.remove(id),
    ...deleteMutationCallbacks(
      queryClient,
      [LIST_KEY],
      'Đã lưu trữ sản phẩm',
      'Không thể lưu trữ sản phẩm',
    ),
  });
}
