'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateProfileInput } from '@repo/contracts';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth-store';
import { useAuthReady } from './use-auth-ready';

export const PROFILE_QUERY_KEY = ['profile'] as const;

// Profile rarely changes within a session, so keep it fresh for 5 min to avoid a
// refetch (and its refresh round-trip) every time the profile page remounts.
export function useProfile(enabled: boolean) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: usersApi.getMe,
    enabled: enabled && authReady,
    staleTime: 5 * 60 * 1000,
  });
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
