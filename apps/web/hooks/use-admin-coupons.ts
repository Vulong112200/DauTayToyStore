'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminCouponQuery, CouponInput } from '@repo/contracts';
import { adminCouponsApi } from '@/lib/api/admin/coupons';

const LIST_KEY = 'admin-coupons';

export function useAdminCoupons(query: Partial<AdminCouponQuery>) {
  return useQuery({
    queryKey: [LIST_KEY, query],
    queryFn: () => adminCouponsApi.list(query),
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CouponInput) => adminCouponsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CouponInput }) =>
      adminCouponsApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCouponsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}
