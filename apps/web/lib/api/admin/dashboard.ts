import type { DashboardSummary } from '@repo/contracts';
import { apiFetch } from '../../api-client';

export const adminDashboardApi = {
  getSummary: () => apiFetch<DashboardSummary>('/admin/dashboard/summary', { auth: true }),
};
