'use client';

import { useQuery } from '@tanstack/react-query';
import { adminDashboardApi } from '@/lib/api/admin/dashboard';

export function useAdminDashboard() {
  return useQuery({ queryKey: ['admin-dashboard'], queryFn: adminDashboardApi.getSummary });
}
