'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminMediaQuery } from '@repo/contracts';
import { adminMediaApi } from '@/lib/api/admin/media';
import { deleteMutationCallbacks, writeMutationCallbacks } from '@/lib/admin-mutations';

const LIST_KEY = 'admin-media';

export function useAdminMedia(query: Partial<AdminMediaQuery>) {
  return useQuery({ queryKey: [LIST_KEY, query], queryFn: () => adminMediaApi.list(query) });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => adminMediaApi.upload(file),
    ...writeMutationCallbacks(queryClient, [[LIST_KEY]], 'Đã tải tệp lên', 'Không thể tải tệp lên'),
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminMediaApi.remove(id),
    ...deleteMutationCallbacks(queryClient, [LIST_KEY], 'Đã xoá tệp', 'Không thể xoá tệp'),
  });
}
