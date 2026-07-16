'use client';

import { useQuery } from '@tanstack/react-query';
import type { AdminAuditLogQuery } from '@repo/contracts';
import { adminAuditLogsApi } from '@/lib/api/admin/audit-logs';

export function useAdminAuditLogs(query: Partial<AdminAuditLogQuery>) {
  return useQuery({
    queryKey: ['admin-audit-logs', query],
    queryFn: () => adminAuditLogsApi.list(query),
  });
}
