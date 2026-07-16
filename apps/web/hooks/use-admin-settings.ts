'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateSiteSettingsInput } from '@repo/contracts';
import { adminSettingsApi } from '@/lib/api/admin/settings';

const SETTINGS_KEY = ['admin-settings'];

export function useAdminSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: () => adminSettingsApi.get() });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSiteSettingsInput) => adminSettingsApi.update(input),
    onSuccess: (data) => queryClient.setQueryData(SETTINGS_KEY, data),
  });
}
