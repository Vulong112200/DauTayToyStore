'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReportRangeQuery } from '@repo/contracts';
import { adminReportsApi } from '@/lib/api/admin/reports';

export function useRevenueReport(query: Partial<ReportRangeQuery>) {
  return useQuery({
    queryKey: ['admin-report-revenue', query],
    queryFn: () => adminReportsApi.revenue(query),
  });
}

export function useTopProductsReport() {
  return useQuery({
    queryKey: ['admin-report-top-products'],
    queryFn: () => adminReportsApi.topProducts(),
  });
}

export function useOrderStatusBreakdownReport() {
  return useQuery({
    queryKey: ['admin-report-order-status-breakdown'],
    queryFn: () => adminReportsApi.orderStatusBreakdown(),
  });
}
