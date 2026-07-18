'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminUpdateUserInput, AdminUserQuery, CreateUserInput, UpdateUserRolesInput } from '@repo/contracts';
import { adminUsersApi } from '@/lib/api/admin/users';
import { writeMutationCallbacks } from '@/lib/admin-mutations';

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
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY]],
      'Đã thêm người dùng',
      'Không thể thêm người dùng',
    ),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminUpdateUserInput }) =>
      adminUsersApi.update(id, input),
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY]],
      'Đã cập nhật người dùng',
      'Không thể cập nhật người dùng',
    ),
  });
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserRolesInput }) =>
      adminUsersApi.updateRoles(id, input),
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY]],
      'Đã cập nhật phân quyền',
      'Không thể cập nhật phân quyền',
    ),
  });
}
