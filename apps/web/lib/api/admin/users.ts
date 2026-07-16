import type {
  AdminUpdateUserInput,
  AdminUserListItem,
  AdminUserQuery,
  CreateUserInput,
  PaginatedResponse,
  UpdateUserRolesInput,
} from '@repo/contracts';
import { apiFetch } from '../../api-client';

function buildQueryString(query: Partial<AdminUserQuery>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const adminUsersApi = {
  list: (query: Partial<AdminUserQuery> = {}) =>
    apiFetch<PaginatedResponse<AdminUserListItem>>(`/admin/users${buildQueryString(query)}`, {
      auth: true,
    }),

  create: (input: CreateUserInput) =>
    apiFetch<AdminUserListItem>('/admin/users', { body: input, auth: true }),

  update: (id: string, input: AdminUpdateUserInput) =>
    apiFetch<AdminUserListItem>(`/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  updateRoles: (id: string, input: UpdateUserRolesInput) =>
    apiFetch<AdminUserListItem>(`/admin/users/${encodeURIComponent(id)}/roles`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),
};
