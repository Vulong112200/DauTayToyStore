import type { AdminAuditLogItem, AdminAuditLogQuery, PaginatedResponse } from '@repo/contracts';
import { apiFetch } from '../../api-client';

function buildQueryString(query: Partial<AdminAuditLogQuery>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const adminAuditLogsApi = {
  list: (query: Partial<AdminAuditLogQuery> = {}) =>
    apiFetch<PaginatedResponse<AdminAuditLogItem>>(`/admin/audit-logs${buildQueryString(query)}`, {
      auth: true,
    }),
};
