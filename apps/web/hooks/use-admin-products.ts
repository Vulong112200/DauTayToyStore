'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminProductQuery, ProductInput } from '@repo/contracts';
import { adminProductsApi } from '@/lib/api/admin/products';
import { deleteMutationCallbacks, writeMutationCallbacks } from '@/lib/admin-mutations';

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
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY]],
      'Đã thêm sản phẩm',
      'Không thể thêm sản phẩm',
    ),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductInput }) =>
      adminProductsApi.update(id, input),
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY], ['admin-product']],
      'Đã cập nhật sản phẩm',
      'Không thể cập nhật sản phẩm',
    ),
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
