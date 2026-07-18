'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BannerInput } from '@repo/contracts';
import { adminBannersApi } from '@/lib/api/admin/banners';
import { deleteMutationCallbacks, writeMutationCallbacks } from '@/lib/admin-mutations';

const LIST_KEY = 'admin-banners';

export function useAdminBanners() {
  return useQuery({ queryKey: [LIST_KEY], queryFn: () => adminBannersApi.list() });
}

export function useCreateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BannerInput) => adminBannersApi.create(input),
    ...writeMutationCallbacks(queryClient, [[LIST_KEY]], 'Đã thêm banner', 'Không thể thêm banner'),
  });
}

export function useUpdateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BannerInput }) =>
      adminBannersApi.update(id, input),
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY]],
      'Đã cập nhật banner',
      'Không thể cập nhật banner',
    ),
  });
}

export function useDeleteBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBannersApi.remove(id),
    ...deleteMutationCallbacks(queryClient, [LIST_KEY], 'Đã xoá banner', 'Không thể xoá banner'),
  });
}
