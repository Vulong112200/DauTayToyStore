'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateProfileInput } from '@repo/contracts';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth-store';

export const PROFILE_QUERY_KEY = ['profile'] as const;

export function useProfile(enabled: boolean) {
  return useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: usersApi.getMe, enabled });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const tokens = useAuthStore((state) => state.tokens);
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => usersApi.updateMe(input),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      if (tokens) setSession(data, tokens);
    },
  });
}
