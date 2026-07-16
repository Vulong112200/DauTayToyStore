import type {
  OrderStatusBreakdownItem,
  ReportRangeQuery,
  RevenueReportPoint,
  TopProductReportItem,
} from '@repo/contracts';
import { apiFetch } from '../../api-client';

function buildQueryString(query: Partial<ReportRangeQuery>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const adminReportsApi = {
  revenue: (query: Partial<ReportRangeQuery> = {}) =>
    apiFetch<RevenueReportPoint[]>(`/admin/reports/revenue${buildQueryString(query)}`, {
      auth: true,
    }),

  topProducts: () =>
    apiFetch<TopProductReportItem[]>('/admin/reports/top-products', { auth: true }),

  orderStatusBreakdown: () =>
    apiFetch<OrderStatusBreakdownItem[]>('/admin/reports/order-status-breakdown', {
      auth: true,
    }),
};
