'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminCouponQuery, CouponInput } from '@repo/contracts';
import { adminCouponsApi } from '@/lib/api/admin/coupons';
import { deleteMutationCallbacks, writeMutationCallbacks } from '@/lib/admin-mutations';

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
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY]],
      'Đã thêm mã giảm giá',
      'Không thể thêm mã giảm giá',
    ),
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CouponInput }) =>
      adminCouponsApi.update(id, input),
    ...writeMutationCallbacks(
      queryClient,
      [[LIST_KEY]],
      'Đã cập nhật mã giảm giá',
      'Không thể cập nhật mã giảm giá',
    ),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCouponsApi.remove(id),
    ...deleteMutationCallbacks(
      queryClient,
      [LIST_KEY],
      'Đã xoá mã giảm giá',
      'Không thể xoá mã giảm giá',
    ),
  });
}
