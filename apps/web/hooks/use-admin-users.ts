'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminUpdateUserInput, AdminUserQuery, CreateUserInput, UpdateUserRolesInput } from '@repo/contracts';
import { adminUsersApi } from '@/lib/api/admin/users';

const LIST_KEY = 'admin-users';

export function useAdminUsers(query: Partial<AdminUserQuery>) {
  return useQuery({
    queryKey: [LIST_KEY, query],
    queryFn: () => adminUsersApi.list(query),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => adminUsersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminUpdateUserInput }) =>
      adminUsersApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserRolesInput }) =>
      adminUsersApi.updateRoles(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}
