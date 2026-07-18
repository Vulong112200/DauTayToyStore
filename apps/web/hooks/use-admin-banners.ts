'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BannerInput } from '@repo/contracts';
import { adminBannersApi } from '@/lib/api/admin/banners';
import { deleteMutationCallbacks } from '@/lib/admin-mutations';

const LIST_KEY = 'admin-banners';

export function useAdminBanners() {
  return useQuery({ queryKey: [LIST_KEY], queryFn: () => adminBannersApi.list() });
}

export function useCreateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BannerInput) => adminBannersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BannerInput }) =>
      adminBannersApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useDeleteBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBannersApi.remove(id),
    ...deleteMutationCallbacks(queryClient, [LIST_KEY], 'Đã xoá banner', 'Không thể xoá banner'),
  });
}
