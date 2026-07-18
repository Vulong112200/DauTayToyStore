'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateSiteSettingsInput } from '@repo/contracts';
import { adminSettingsApi } from '@/lib/api/admin/settings';
import { toastError, toastSuccess } from '@/lib/toast';

const SETTINGS_KEY = ['admin-settings'];

export function useAdminSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: () => adminSettingsApi.get() });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSiteSettingsInput) => adminSettingsApi.update(input),
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_KEY, data);
      toastSuccess('Đã lưu cài đặt');
    },
    onError: (error: unknown) => toastError(error, 'Không thể lưu cài đặt'),
  });
}
